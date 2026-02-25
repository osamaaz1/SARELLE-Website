import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

const COMMISSION_RATES: Record<string, number> = {
  Bronze: parseInt(process.env.COMMISSION_BRONZE || '20'),
  Silver: parseInt(process.env.COMMISSION_SILVER || '18'),
  Gold: parseInt(process.env.COMMISSION_GOLD || '15'),
  Platinum: parseInt(process.env.COMMISSION_PLATINUM || '12'),
};

@Injectable()
export class PayoutsService {
  constructor(private readonly supabase: SupabaseService) {}

  async trigger(orderId: string, adminId: string) {
    const client = this.supabase.getClient();

    // Check if payout already exists
    const { data: existingPayout } = await client
      .from('wimc_payouts')
      .select('*')
      .eq('order_id', orderId)
      .single();
    if (existingPayout) return existingPayout; // Idempotent

    const { data: order } = await client
      .from('wimc_orders')
      .select('*')
      .eq('id', orderId)
      .single();
    if (!order) throw new NotFoundException('Order not found');

    if (!['delivered', 'inspection_window', 'completed'].includes(order.status)) {
      throw new BadRequestException('Order not eligible for payout');
    }

    if (order.inspection_ends_at && new Date(order.inspection_ends_at) > new Date()) {
      throw new BadRequestException('Inspection window has not ended');
    }

    // Get seller tier for commission
    const { data: profile } = await client
      .from('wimc_profiles')
      .select('tier')
      .eq('id', order.seller_id)
      .single();

    const tier = profile?.tier || 'Bronze';
    const commissionRate = COMMISSION_RATES[tier] || 20;
    const commissionAmount = Math.round(order.item_price * (commissionRate / 100) * 100) / 100;
    const payoutAmount = order.item_price - commissionAmount;

    const { data: payout, error } = await client
      .from('wimc_payouts')
      .insert({
        order_id: orderId,
        seller_id: order.seller_id,
        amount: payoutAmount,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        status: 'pending',
        scheduled_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);

    // Update order status
    await client.from('wimc_orders').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', orderId);

    return payout;
  }

  async listBySeller(sellerId: string) {
    const client = this.supabase.getClient();
    const { data } = await client
      .from('wimc_payouts')
      .select('*, wimc_orders(id, wimc_listings(name, brand))')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });
    return data || [];
  }

  async adminList(status?: string) {
    const client = this.supabase.getClient();
    let query = client
      .from('wimc_payouts')
      .select('*, wimc_profiles!wimc_payouts_seller_id_fkey(display_name), wimc_orders(id, wimc_listings(name, brand))')
      .order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data } = await query;
    return data || [];
  }

  async updateStatus(payoutId: string, status: string) {
    const client = this.supabase.getClient();
    const updates: Record<string, any> = { status, updated_at: new Date().toISOString() };
    if (status === 'sent') updates.sent_at = new Date().toISOString();
    const { data, error } = await client
      .from('wimc_payouts')
      .update(updates)
      .eq('id', payoutId)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
