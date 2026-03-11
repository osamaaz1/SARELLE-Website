import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { EmailService } from '../email/email.service';
import { WimcGateway } from '../gateway/wimc.gateway';

const SERVICE_FEE_RATE = 0.20;
const DEFAULT_SHIPPING_FEE = 50;

const VALID_ORDER_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['shipped'],
  shipped: ['delivered'],
  delivered: ['completed', 'disputed'],
  completed: [],
  cancelled: [],
  disputed: ['completed', 'cancelled'],
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly emailService: EmailService,
    private readonly gateway: WimcGateway,
  ) {}

  async create(buyerId: string, data: {
    listing_id: string;
    shipping_address: { street: string; city: string; zip: string; country: string; [key: string]: any };
    idempotency_key: string;
    offer_id?: string;
    auction_id?: string;
  }) {
    const client = this.supabase.getClient();

    // Idempotency check
    const { data: existing } = await client
      .from('wimc_idempotency_keys')
      .select('response_body')
      .eq('key', data.idempotency_key)
      .single();
    if (existing) return existing.response_body;

    // Store idempotency key FIRST with pending status to prevent duplicates on crash
    await client.from('wimc_idempotency_keys').insert({
      key: data.idempotency_key,
      user_id: buyerId,
      endpoint: 'POST /orders',
      response_body: { status: 'pending' },
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    const { data: listing } = await client
      .from('wimc_listings')
      .select('*')
      .eq('id', data.listing_id)
      .single();
    if (!listing) throw new NotFoundException('Listing not found');

    // Atomic: mark listing as sold only if currently available (prevents double-buy)
    const { data: claimed, error: claimError } = await client
      .from('wimc_listings')
      .update({ status: 'sold', updated_at: new Date().toISOString() })
      .eq('id', data.listing_id)
      .in('status', ['published', 'reserved'])
      .select()
      .single();
    if (claimError || !claimed) {
      throw new BadRequestException('Listing not available for purchase');
    }

    let itemPrice = listing.price;
    if (data.auction_id) {
      // Auction winner checkout
      const { data: auction } = await client
        .from('wimc_auctions')
        .select('*')
        .eq('id', data.auction_id)
        .eq('status', 'ended')
        .single();
      if (!auction) throw new BadRequestException('Invalid auction');
      if (auction.current_winner_id !== buyerId) throw new ForbiddenException('You are not the auction winner');
      if (auction.reserve_price && !auction.reserve_met) throw new BadRequestException('Reserve price was not met');
      itemPrice = auction.current_price;
    } else if (data.offer_id) {
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

    // Parallelize post-insert writes: order event + idempotency key update
    await Promise.all([
      client.from('wimc_order_events').insert({
        order_id: order.id,
        from_status: null,
        to_status: 'pending_payment',
        changed_by: buyerId,
      }),
      client.from('wimc_idempotency_keys')
        .update({ response_body: order })
        .eq('key', data.idempotency_key),
    ]);

    // Send order confirmation emails
    this.sendOrderEmails(buyerId, listing.seller_id, listing.name || listing.brand, total, itemPrice, order.id)
      .catch(e => this.logger.error('Email error', e));

    // Real-time: notify seller + admin of new order
    this.gateway.emitToUser(listing.seller_id, 'order:new', order);
    this.gateway.emitToAdmin('order:new', order);

    return order;
  }

  private async sendOrderEmails(buyerId: string, sellerId: string, itemName: string, total: number, itemPrice: number, orderId: string) {
    const client = this.supabase.getClient();
    const [buyerAuth, sellerAuth] = await Promise.all([
      client.auth.admin.getUserById(buyerId),
      client.auth.admin.getUserById(sellerId),
    ]);
    const buyerEmail = buyerAuth.data?.user?.email;
    const sellerEmail = sellerAuth.data?.user?.email;
    if (buyerEmail && sellerEmail) {
      await this.emailService.sendOrderConfirmation(buyerEmail, sellerEmail, itemName, total, itemPrice, orderId);
    }
  }

  async listByUser(userId: string, role: string) {
    const client = this.supabase.getClient();
    const column = role === 'celebrity' ? 'seller_id' : 'buyer_id';
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

    // Validate status transition
    const allowedNext = VALID_ORDER_TRANSITIONS[order.status];
    if (!allowedNext) {
      throw new BadRequestException(`Unknown current order status: ${order.status}`);
    }
    if (!allowedNext.includes(status)) {
      throw new BadRequestException(`Cannot transition from '${order.status}' to '${status}'. Allowed: ${allowedNext.join(', ') || 'none'}`);
    }

    const updates: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (data?.tracking_number) updates.tracking_number = data.tracking_number;
    if (status === 'shipped') updates.shipped_at = new Date().toISOString();
    if (status === 'delivered') {
      updates.delivered_at = new Date().toISOString();
      const inspectionDays = parseInt(process.env.PAYOUT_DELAY_DAYS || '3') || 3;
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

    // Send shipping update email to buyer
    if (status === 'shipped' || status === 'delivered') {
      this.sendShippingEmail(order.buyer_id, order.listing_id, status, data?.tracking_number)
        .catch(e => this.logger.error('Email error', e));
    }

    // Real-time: notify buyer + seller of status change
    const statusPayload = { id: orderId, status, tracking_number: data?.tracking_number };
    this.gateway.emitToUser(order.buyer_id, 'order:status-changed', statusPayload);
    this.gateway.emitToUser(order.seller_id, 'order:status-changed', statusPayload);

    return { ...order, ...updates };
  }

  private async sendShippingEmail(buyerId: string, listingId: string, status: string, trackingNumber?: string) {
    const client = this.supabase.getClient();
    const [buyerAuth, listing] = await Promise.all([
      client.auth.admin.getUserById(buyerId),
      client.from('wimc_listings').select('name, brand').eq('id', listingId).single(),
    ]);
    const buyerEmail = buyerAuth.data?.user?.email;
    const itemName = listing.data ? `${listing.data.brand} ${listing.data.name}` : 'your item';
    if (buyerEmail) {
      await this.emailService.sendShippingUpdate(buyerEmail, itemName, status, trackingNumber);
    }
  }
}
