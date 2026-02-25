import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

const SERVICE_FEE_RATE = 0.20;
const DEFAULT_SHIPPING_FEE = 50;

@Injectable()
export class OrdersService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(buyerId: string, data: {
    listing_id: string;
    shipping_address: Record<string, any>;
    idempotency_key: string;
    offer_id?: string;
  }) {
    const client = this.supabase.getClient();

    // Idempotency check
    const { data: existing } = await client
      .from('wimc_idempotency_keys')
      .select('response_body')
      .eq('key', data.idempotency_key)
      .single();
    if (existing) return existing.response_body;

    const { data: listing } = await client
      .from('wimc_listings')
      .select('*')
      .eq('id', data.listing_id)
      .single();
    if (!listing) throw new NotFoundException('Listing not found');
    if (!['published', 'reserved'].includes(listing.status)) {
      throw new BadRequestException('Listing not available for purchase');
    }

    let itemPrice = listing.price;
    if (data.offer_id) {
      const { data: offer } = await client
        .from('wimc_offers')
        .select('*')
        .eq('id', data.offer_id)
        .eq('buyer_id', buyerId)
        .eq('status', 'accepted')
        .single();
      if (!offer) throw new BadRequestException('Invalid offer');
      itemPrice = offer.amount;
    }

    const serviceFee = Math.round(itemPrice * SERVICE_FEE_RATE * 100) / 100;
    const shippingFee = DEFAULT_SHIPPING_FEE;
    const total = itemPrice + serviceFee + shippingFee;

    const { data: order, error } = await client
      .from('wimc_orders')
      .insert({
        listing_id: data.listing_id,
        buyer_id: buyerId,
        seller_id: listing.seller_id,
        item_price: itemPrice,
        service_fee: serviceFee,
        shipping_fee: shippingFee,
        total,
        status: 'pending_payment',
        shipping_address: data.shipping_address,
        idempotency_key: data.idempotency_key,
      })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);

    // Mark listing as sold
    await client.from('wimc_listings').update({ status: 'sold', updated_at: new Date().toISOString() }).eq('id', data.listing_id);

    // Add order event
    await client.from('wimc_order_events').insert({
      order_id: order.id,
      from_status: null,
      to_status: 'pending_payment',
      changed_by: buyerId,
    });

    // Store idempotency
    await client.from('wimc_idempotency_keys').insert({
      key: data.idempotency_key,
      user_id: buyerId,
      endpoint: 'POST /orders',
      response_body: order,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    return order;
  }

  async listByUser(userId: string, role: string) {
    const client = this.supabase.getClient();
    const column = role === 'seller' || role === 'vip_seller' ? 'seller_id' : 'buyer_id';
    const { data } = await client
      .from('wimc_orders')
      .select('*, wimc_listings(id, name, brand, photos)')
      .eq(column, userId)
      .order('created_at', { ascending: false });
    return data || [];
  }

  async getById(id: string, userId: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('wimc_orders')
      .select('*, wimc_listings(id, name, brand, photos, category), wimc_order_events(*)' )
      .eq('id', id)
      .single();
    if (error || !data) throw new NotFoundException('Order not found');
    if (data.buyer_id !== userId && data.seller_id !== userId) {
      throw new ForbiddenException('Not your order');
    }
    return data;
  }

  async adminUpdateStatus(orderId: string, adminId: string, status: string, data?: {
    tracking_number?: string;
    reason?: string;
  }) {
    const client = this.supabase.getClient();
    const { data: order } = await client
      .from('wimc_orders')
      .select('*')
      .eq('id', orderId)
      .single();
    if (!order) throw new NotFoundException('Order not found');

    const updates: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (data?.tracking_number) updates.tracking_number = data.tracking_number;
    if (status === 'shipped') updates.shipped_at = new Date().toISOString();
    if (status === 'delivered') {
      updates.delivered_at = new Date().toISOString();
      const inspectionDays = parseInt(process.env.PAYOUT_DELAY_DAYS || '3');
      updates.inspection_ends_at = new Date(Date.now() + inspectionDays * 24 * 60 * 60 * 1000).toISOString();
    }

    const { error } = await client.from('wimc_orders').update(updates).eq('id', orderId);
    if (error) throw new BadRequestException(error.message);

    await client.from('wimc_order_events').insert({
      order_id: orderId,
      from_status: order.status,
      to_status: status,
      changed_by: adminId,
      reason: data?.reason,
    });

    return { ...order, ...updates };
  }
}
