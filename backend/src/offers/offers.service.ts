import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class OffersService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(buyerId: string, data: { listing_id: string; amount: number; idempotency_key: string }) {
    const client = this.supabase.getClient();

    // Check idempotency
    const { data: existing } = await client
      .from('wimc_idempotency_keys')
      .select('response_body')
      .eq('key', data.idempotency_key)
      .single();
    if (existing) return existing.response_body;

    // Verify listing exists and is published
    const { data: listing } = await client
      .from('wimc_listings')
      .select('*')
      .eq('id', data.listing_id)
      .eq('status', 'published')
      .single();
    if (!listing) throw new NotFoundException('Listing not found or not available');
    if (listing.seller_id === buyerId) throw new ForbiddenException('Cannot make offer on own listing');

    const { data: offer, error } = await client
      .from('wimc_offers')
      .insert({
        listing_id: data.listing_id,
        buyer_id: buyerId,
        amount: data.amount,
        status: 'pending',
        idempotency_key: data.idempotency_key,
      })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);

    // Store idempotency
    await client.from('wimc_idempotency_keys').insert({
      key: data.idempotency_key,
      user_id: buyerId,
      endpoint: 'POST /offers',
      response_body: offer,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    return offer;
  }

  async getSent(buyerId: string) {
    const client = this.supabase.getClient();
    const { data } = await client
      .from('wimc_offers')
      .select('*, wimc_listings(id, name, brand, photos, price)')
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false });
    return data || [];
  }

  async getReceived(sellerId: string) {
    const client = this.supabase.getClient();
    const { data } = await client
      .from('wimc_offers')
      .select('*, wimc_listings!inner(id, name, brand, photos, price, seller_id), wimc_profiles!wimc_offers_buyer_id_fkey(display_name, avatar_url)')
      .eq('wimc_listings.seller_id', sellerId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    return data || [];
  }

  async accept(offerId: string, sellerId: string) {
    const client = this.supabase.getClient();
    const offer = await this.getOfferForSeller(offerId, sellerId);

    // Accept this offer
    await client.from('wimc_offers').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', offerId);

    // Reject all other pending offers on same listing
    await client
      .from('wimc_offers')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('listing_id', offer.listing_id)
      .eq('status', 'pending')
      .neq('id', offerId);

    // Reserve the listing
    await client.from('wimc_listings').update({ status: 'reserved', updated_at: new Date().toISOString() }).eq('id', offer.listing_id);

    return { ...offer, status: 'accepted' };
  }

  async reject(offerId: string, sellerId: string) {
    await this.getOfferForSeller(offerId, sellerId);
    const client = this.supabase.getClient();
    const { data } = await client
      .from('wimc_offers')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', offerId)
      .select()
      .single();
    return data;
  }

  async withdraw(offerId: string, buyerId: string) {
    const client = this.supabase.getClient();
    const { data: offer } = await client
      .from('wimc_offers')
      .select('*')
      .eq('id', offerId)
      .eq('buyer_id', buyerId)
      .eq('status', 'pending')
      .single();
    if (!offer) throw new NotFoundException('Offer not found');

    const { data } = await client
      .from('wimc_offers')
      .update({ status: 'withdrawn', updated_at: new Date().toISOString() })
      .eq('id', offerId)
      .select()
      .single();
    return data;
  }

  private async getOfferForSeller(offerId: string, sellerId: string) {
    const client = this.supabase.getClient();
    const { data: offer } = await client
      .from('wimc_offers')
      .select('*, wimc_listings!inner(seller_id)')
      .eq('id', offerId)
      .eq('status', 'pending')
      .single();
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.wimc_listings.seller_id !== sellerId) throw new ForbiddenException('Not your listing');
    return offer;
  }
}
