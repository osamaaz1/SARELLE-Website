import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { EmailService } from '../email/email.service';
import { WimcGateway } from '../gateway/wimc.gateway';

@Injectable()
export class OffersService {
  private readonly logger = new Logger(OffersService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly emailService: EmailService,
    private readonly gateway: WimcGateway,
  ) {}

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

    // Store idempotency key FIRST with pending status to prevent duplicates on crash
    await client.from('wimc_idempotency_keys').insert({
      key: data.idempotency_key,
      user_id: buyerId,
      endpoint: 'POST /offers',
      response_body: { status: 'pending' },
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

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

    // Update idempotency key with actual response
    await client.from('wimc_idempotency_keys')
      .update({ response_body: offer })
      .eq('key', data.idempotency_key);

    // Notify seller via email
    this.sendOfferEmail(listing.seller_id, buyerId, listing.name || listing.brand, data.amount)
      .catch(e => this.logger.error('Email error', e));

    // Real-time: notify seller of new offer
    this.gateway.emitToUser(listing.seller_id, 'offer:new', offer);

    return offer;
  }

  private async sendOfferEmail(sellerId: string, buyerId: string, itemName: string, amount: number) {
    const client = this.supabase.getClient();
    const [sellerAuth, buyerProfile] = await Promise.all([
      client.auth.admin.getUserById(sellerId),
      client.from('wimc_profiles').select('display_name').eq('id', buyerId).single(),
    ]);
    const sellerEmail = sellerAuth.data?.user?.email;
    const buyerName = buyerProfile.data?.display_name || 'A buyer';
    if (sellerEmail) {
      await this.emailService.sendNewOffer(sellerEmail, itemName, amount, buyerName);
    }
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

    // Atomic: accept only if still pending (prevents double-accept race condition)
    const { data: accepted, error: acceptError } = await client
      .from('wimc_offers')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', offerId)
      .eq('status', 'pending')
      .select()
      .single();
    if (acceptError || !accepted) {
      throw new BadRequestException('Offer is no longer pending');
    }

    // Reject all other pending offers on same listing
    await client
      .from('wimc_offers')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('listing_id', offer.listing_id)
      .eq('status', 'pending')
      .neq('id', offerId);

    // Reserve the listing
    await client.from('wimc_listings').update({ status: 'reserved', updated_at: new Date().toISOString() }).eq('id', offer.listing_id);

    // Notify buyer of acceptance
    this.sendOfferResponseEmail(offer.buyer_id, offer.listing_id, true, offer.amount)
      .catch(e => this.logger.error('Email error', e));

    // Real-time: notify buyer
    this.gateway.emitToUser(offer.buyer_id, 'offer:updated', { id: offerId, status: 'accepted' });

    return { ...offer, status: 'accepted' };
  }

  async reject(offerId: string, sellerId: string) {
    const offer = await this.getOfferForSeller(offerId, sellerId);
    const client = this.supabase.getClient();

    // Atomic: reject only if still pending (prevents race with accept)
    const { data, error } = await client
      .from('wimc_offers')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', offerId)
      .eq('status', 'pending')
      .select()
      .single();
    if (error || !data) {
      throw new BadRequestException('Offer is no longer pending');
    }

    // Notify buyer of rejection
    this.sendOfferResponseEmail(offer.buyer_id, offer.listing_id, false, offer.amount)
      .catch(e => this.logger.error('Email error', e));

    // Real-time: notify buyer
    this.gateway.emitToUser(offer.buyer_id, 'offer:updated', { id: offerId, status: 'rejected' });

    return data;
  }

  private async sendOfferResponseEmail(buyerId: string, listingId: string, accepted: boolean, amount: number) {
    const client = this.supabase.getClient();
    const [buyerAuth, listing] = await Promise.all([
      client.auth.admin.getUserById(buyerId),
      client.from('wimc_listings').select('name, brand').eq('id', listingId).single(),
    ]);
    const buyerEmail = buyerAuth.data?.user?.email;
    const itemName = listing.data ? `${listing.data.brand} ${listing.data.name}` : 'your item';
    if (buyerEmail) {
      await this.emailService.sendOfferResponse(buyerEmail, itemName, accepted, amount);
    }
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

    // Atomic: withdraw only if still pending
    const { data: updated, error } = await client
      .from('wimc_offers')
      .update({ status: 'withdrawn', updated_at: new Date().toISOString() })
      .eq('id', offerId)
      .eq('status', 'pending')
      .select()
      .single();
    if (error || !updated) {
      throw new BadRequestException('Offer is no longer pending');
    }
    return updated;
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
