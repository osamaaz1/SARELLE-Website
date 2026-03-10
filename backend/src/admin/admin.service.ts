import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AdminService {
  constructor(private readonly supabase: SupabaseService) {}

  async getDashboardStats() {
    const client = this.supabase.getClient();

    const [submissions, listings, orders, payouts] = await Promise.all([
      client.from('wimc_submissions').select('stage', { count: 'exact' }),
      client.from('wimc_listings').select('status', { count: 'exact' }),
      client.from('wimc_orders').select('total', { count: 'exact' }),
      client.from('wimc_payouts').select('status, amount', { count: 'exact' }),
    ]);

    return {
      totalSubmissions: submissions.count || 0,
      totalListings: listings.count || 0,
      totalOrders: orders.count || 0,
      totalPayouts: payouts.count || 0,
      revenue: (orders.data || []).reduce((sum: number, o: any) => sum + (o.total || 0), 0),
    };
  }

  async getPipelineOverview() {
    const client = this.supabase.getClient();
    const { data } = await client
      .from('wimc_submissions')
      .select('stage');

    const counts: Record<string, number> = {};
    (data || []).forEach((s: any) => {
      counts[s.stage] = (counts[s.stage] || 0) + 1;
    });
    return counts;
  }

  async listSellers(page = 1, limit = 20) {
    const client = this.supabase.getClient();
    const offset = (page - 1) * limit;
    const { data, count } = await client
      .from('wimc_profiles')
      .select('*, wimc_seller_profiles(*)', { count: 'exact' })
      .in('role', ['seller', 'vip_seller'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    return { sellers: data || [], total: count || 0, page };
  }

  async manageCelebrities() {
    const client = this.supabase.getClient();
    const { data } = await client
      .from('wimc_celebrities')
      .select('*')
      .order('created_at', { ascending: false });
    return data || [];
  }

  async createCelebrity(data: { name: string; bio: string; followers: string; avatar_url?: string; user_id?: string }) {
    const client = this.supabase.getClient();
    const { data: celebrity, error } = await client
      .from('wimc_celebrities')
      .insert({ ...data, verified: true })
      .select()
      .single();
    if (error) throw new BadRequestException('Failed to create celebrity');
    return celebrity;
  }
}
