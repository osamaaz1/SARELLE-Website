import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class UsersService {
  constructor(private readonly supabase: SupabaseService) {}

  async getProfile(userId: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('wimc_profiles')
      .select('*, wimc_seller_profiles(*)')
      .eq('id', userId)
      .single();
    if (error) throw new NotFoundException('Profile not found');
    return data;
  }

  async updateProfile(userId: string, updates: { display_name?: string; phone?: string; avatar_url?: string }) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('wimc_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw new NotFoundException('Profile not found');
    return data;
  }

  async getSellerCloset(sellerId: string) {
    const client = this.supabase.getClient();

    const { data: profile } = await client
      .from('wimc_profiles')
      .select('id, display_name, avatar_url, tier')
      .eq('id', sellerId)
      .single();
    if (!profile) throw new NotFoundException('Seller not found');

    const { data: listings } = await client
      .from('wimc_listings')
      .select('*')
      .eq('seller_id', sellerId)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    return { seller: profile, listings: listings || [] };
  }
}
