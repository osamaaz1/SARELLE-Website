import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WimcGateway } from '../gateway/wimc.gateway';

const ANTI_SNIPE_MINUTES = 5;

@Injectable()
export class BidsService {
  private readonly logger = new Logger(BidsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
    private readonly gateway: WimcGateway,
  ) {}

  // --- Bid Increment Calculator (EGP tiers) ---
  private getIncrement(price: number): number {
    if (price < 100) return 1;
    if (price < 500) return 5;
    if (price < 1000) return 10;
    if (price < 5000) return 25;
    if (price < 25000) return 50;
    return 100;
  }

  // --- Create Auction ---
  async createAuction(data: {
    listing_id: string;
    starting_price: number;
    starts_at: string;
    ends_at: string;
    reserve_price?: number;
  }) {
    const client = this.supabase.getClient();

    // Verify listing exists and is published
    const { data: listing } = await client
      .from('wimc_listings')
      .select('id, celebrity_id, status')
      .eq('id', data.listing_id)
      .eq('status', 'published')
      .single();
    if (!listing) throw new NotFoundException('Listing not found or not published');

    // If reserve_price provided, verify listing has celebrity_id
    if (data.reserve_price && !listing.celebrity_id) {
      throw new BadRequestException('Reserve price is only available for celebrity listings');
    }

    // Check no existing auction for this listing
    const { data: existing } = await client
      .from('wimc_auctions')
      .select('id')
      .eq('listing_id', data.listing_id)
      .in('status', ['active'])
      .single();
    if (existing) throw new BadRequestException('An active auction already exists for this listing');

    // Update listing type
    await client
      .from('wimc_listings')
      .update({ listing_type: 'auction', updated_at: new Date().toISOString() })
      .eq('id', data.listing_id);

    // Insert auction
    const { data: auction, error } = await client
      .from('wimc_auctions')
      .insert({
        listing_id: data.listing_id,
        starting_price: data.starting_price,
        reserve_price: data.reserve_price || null,
        current_price: data.starting_price,
        status: 'active',
        starts_at: data.starts_at,
        ends_at: data.ends_at,
      })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);

    return auction;
  }

  // --- Place Bid (Proxy Bidding Engine) ---
  async placeBid(auctionId: string, bidderId: string, maxAmount: number) {
    const client = this.supabase.getClient();

    // 1. Validate auction
    const { data: auction } = await client
      .from('wimc_auctions')
      .select('*, wimc_listings!inner(id, name, brand, seller_id)')
      .eq('id', auctionId)
      .single();
    if (!auction) throw new NotFoundException('Auction not found');
    if (auction.status !== 'active') throw new BadRequestException('Auction is not active');
    if (new Date(auction.ends_at) < new Date()) throw new BadRequestException('Auction has ended');

    // Bidder cannot be the seller
    if (auction.wimc_listings.seller_id === bidderId) {
      throw new ForbiddenException('Cannot bid on your own listing');
    }

    // 2. Fetch current winning bid (highest max_amount)
    const { data: currentWinningBid } = await client
      .from('wimc_bids')
      .select('*')
      .eq('auction_id', auctionId)
      .eq('status', 'winning')
      .order('max_amount', { ascending: false })
      .limit(1)
      .single();

    const minimumBid = currentWinningBid
      ? currentWinningBid.proxy_amount + this.getIncrement(currentWinningBid.proxy_amount)
      : auction.starting_price;

    // Check if same bidder raising their max
    if (currentWinningBid && currentWinningBid.bidder_id === bidderId) {
      // Case E: Same bidder raising max
      if (maxAmount <= currentWinningBid.max_amount) {
        throw new BadRequestException('New maximum must be higher than your current maximum');
      }
      await client
        .from('wimc_bids')
        .update({ max_amount: maxAmount })
        .eq('id', currentWinningBid.id);

      return {
        status: 'winning',
        current_price: auction.current_price,
        message: 'Maximum bid updated. You are still the highest bidder.',
      };
    }

    // Validate maxAmount meets minimum
    if (maxAmount < minimumBid) {
      throw new BadRequestException(`Bid must be at least EGP ${minimumBid.toLocaleString()}`);
    }

    let newPrice: number;
    let newWinnerId: string;
    let outbidUserId: string | null = null;

    if (!currentWinningBid) {
      // Case A: First bid
      newPrice = auction.starting_price;
      newWinnerId = bidderId;
    } else if (maxAmount > currentWinningBid.max_amount) {
      // Case B: New bidder wins
      newPrice = currentWinningBid.max_amount + this.getIncrement(currentWinningBid.max_amount);
      // Cap at new bidder's max
      if (newPrice > maxAmount) newPrice = maxAmount;
      newWinnerId = bidderId;
      outbidUserId = currentWinningBid.bidder_id;

      // Mark old winning bid as outbid
      await client
        .from('wimc_bids')
        .update({ status: 'outbid' })
        .eq('id', currentWinningBid.id);
    } else if (maxAmount < currentWinningBid.max_amount) {
      // Case C: Current winner stays
      newPrice = maxAmount + this.getIncrement(maxAmount);
      // Cap at current winner's max
      if (newPrice > currentWinningBid.max_amount) newPrice = currentWinningBid.max_amount;
      newWinnerId = currentWinningBid.bidder_id;

      // Update existing winner's proxy_amount
      await client
        .from('wimc_bids')
        .update({ proxy_amount: newPrice })
        .eq('id', currentWinningBid.id);
    } else {
      // Case D: Tie — earlier bidder wins (eBay convention)
      newPrice = maxAmount;
      newWinnerId = currentWinningBid.bidder_id;

      // Update existing winner's proxy_amount
      await client
        .from('wimc_bids')
        .update({ proxy_amount: newPrice })
        .eq('id', currentWinningBid.id);
    }

    // Insert new bid
    const bidStatus = newWinnerId === bidderId ? 'winning' : 'outbid';
    const { data: newBid, error: bidError } = await client
      .from('wimc_bids')
      .insert({
        auction_id: auctionId,
        bidder_id: bidderId,
        max_amount: maxAmount,
        proxy_amount: bidStatus === 'winning' ? newPrice : maxAmount,
        status: bidStatus,
      })
      .select()
      .single();
    if (bidError) throw new BadRequestException(bidError.message);

    // Anti-sniping: extend auction if bid placed in last 5 minutes
    let endsAt = auction.ends_at;
    const timeLeft = new Date(auction.ends_at).getTime() - Date.now();
    if (timeLeft < ANTI_SNIPE_MINUTES * 60 * 1000 && timeLeft > 0) {
      endsAt = new Date(Date.now() + ANTI_SNIPE_MINUTES * 60 * 1000).toISOString();
    }

    // Reserve check
    let reserveMet = auction.reserve_met;
    if (auction.reserve_price && newPrice >= auction.reserve_price) {
      reserveMet = true;
    }

    // Update auction
    await client
      .from('wimc_auctions')
      .update({
        current_price: newPrice,
        current_winner_id: newWinnerId,
        bid_count: auction.bid_count + 1,
        ends_at: endsAt,
        reserve_met: reserveMet,
        updated_at: new Date().toISOString(),
      })
      .eq('id', auctionId);

    // Notify outbid user
    if (outbidUserId) {
      const listingName = `${auction.wimc_listings.brand} ${auction.wimc_listings.name}`;
      this.notifications.create(outbidUserId, {
        type: 'auction_outbid',
        title: 'You\'ve been outbid!',
        message: `Someone placed a higher bid on ${listingName}. Current price: EGP ${newPrice.toLocaleString()}`,
        action_url: `/listing/${auction.listing_id}`,
      }).catch(e => this.logger.error('Notification error', e));

      this.gateway.emitToUser(outbidUserId, 'auction:outbid', {
        auction_id: auctionId,
        listing_name: listingName,
        current_price: newPrice,
      });
    }

    // WebSocket: emit to auction room (NEVER expose max_amount)
    this.gateway.emitToAuction(auctionId, 'auction:bidPlaced', {
      current_price: newPrice,
      bid_count: auction.bid_count + 1,
      reserve_met: reserveMet,
      ends_at: endsAt,
    });

    return {
      status: bidStatus,
      current_price: newPrice,
      bid_count: auction.bid_count + 1,
      reserve_met: reserveMet,
      ends_at: endsAt,
      message: bidStatus === 'winning'
        ? 'You\'re the highest bidder!'
        : 'You\'ve been outbid. The current bidder\'s maximum is higher than yours.',
    };
  }

  // --- End Auction ---
  async endAuction(auctionId: string) {
    const client = this.supabase.getClient();

    const { data: auction } = await client
      .from('wimc_auctions')
      .select('*, wimc_listings!inner(id, name, brand, seller_id)')
      .eq('id', auctionId)
      .single();
    if (!auction) throw new NotFoundException('Auction not found');
    if (auction.status !== 'active') throw new BadRequestException('Auction is not active');

    // Mark auction as ended
    await client
      .from('wimc_auctions')
      .update({ status: 'ended', updated_at: new Date().toISOString() })
      .eq('id', auctionId);

    const listingName = `${auction.wimc_listings.brand} ${auction.wimc_listings.name}`;

    // If reserve not met and reserve exists → no sale
    if (auction.reserve_price && !auction.reserve_met) {
      // Mark all bids as lost
      await client
        .from('wimc_bids')
        .update({ status: 'lost' })
        .eq('auction_id', auctionId);

      // Notify seller
      this.notifications.create(auction.wimc_listings.seller_id, {
        type: 'auction_ended',
        title: 'Auction ended — Reserve not met',
        message: `The auction for ${listingName} ended without meeting the reserve price.`,
        action_url: `/listing/${auction.listing_id}`,
      }).catch(e => this.logger.error('Notification error', e));

      this.gateway.emitToAuction(auctionId, 'auction:ended', {
        winning_price: null,
        winner_id: null,
        reserve_met: false,
      });

      return { status: 'ended', winner: null, reason: 'reserve_not_met' };
    }

    // Winner exists
    if (auction.current_winner_id) {
      // Mark winning bid
      await client
        .from('wimc_bids')
        .update({ status: 'won' })
        .eq('auction_id', auctionId)
        .eq('bidder_id', auction.current_winner_id)
        .eq('status', 'winning');

      // Mark other bids as lost
      await client
        .from('wimc_bids')
        .update({ status: 'lost' })
        .eq('auction_id', auctionId)
        .neq('status', 'won');

      // Reserve listing for winner
      await client
        .from('wimc_listings')
        .update({ status: 'reserved', updated_at: new Date().toISOString() })
        .eq('id', auction.listing_id);

      // Notify winner
      this.notifications.create(auction.current_winner_id, {
        type: 'auction_won',
        title: 'You won the auction!',
        message: `Congratulations! You won ${listingName} for EGP ${auction.current_price.toLocaleString()}. Complete checkout within 48 hours.`,
        action_url: `/checkout/${auction.listing_id}`,
      }).catch(e => this.logger.error('Notification error', e));

      // Notify seller
      this.notifications.create(auction.wimc_listings.seller_id, {
        type: 'auction_ended',
        title: 'Auction ended — Sold!',
        message: `${listingName} sold for EGP ${auction.current_price.toLocaleString()}.`,
        action_url: `/listing/${auction.listing_id}`,
      }).catch(e => this.logger.error('Notification error', e));

      this.gateway.emitToAuction(auctionId, 'auction:ended', {
        winning_price: auction.current_price,
        winner_id: auction.current_winner_id,
        reserve_met: auction.reserve_met,
      });

      return {
        status: 'ended',
        winner_id: auction.current_winner_id,
        winning_price: auction.current_price,
      };
    }

    // No bids at all
    this.gateway.emitToAuction(auctionId, 'auction:ended', {
      winning_price: null,
      winner_id: null,
    });

    return { status: 'ended', winner: null, reason: 'no_bids' };
  }

  // --- Get Auction by Listing ID (public — omits reserve_price) ---
  async getAuctionByListing(listingId: string) {
    const client = this.supabase.getClient();
    const { data: auction } = await client
      .from('wimc_auctions')
      .select('id, listing_id, starting_price, reserve_met, current_price, current_winner_id, status, starts_at, ends_at, bid_count, created_at')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    return auction;
  }

  // --- Get Auction by Listing ID (admin — includes reserve_price) ---
  async getAuctionByListingAdmin(listingId: string) {
    const client = this.supabase.getClient();
    const { data: auction } = await client
      .from('wimc_auctions')
      .select('*')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    return auction;
  }

  // --- Bid History (public — anonymized, no max_amount) ---
  async getBidHistory(auctionId: string) {
    const client = this.supabase.getClient();
    const { data: bids } = await client
      .from('wimc_bids')
      .select('id, proxy_amount, status, created_at, wimc_profiles!wimc_bids_bidder_id_fkey(display_name)')
      .eq('auction_id', auctionId)
      .order('created_at', { ascending: false });

    // Anonymize bidder names: show first + last letter
    return (bids || []).map(bid => {
      const name = (bid as any).wimc_profiles?.display_name || 'Bidder';
      const anonymized = name.length > 1
        ? `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}`
        : name;
      return {
        id: bid.id,
        bidder_name: anonymized,
        amount: bid.proxy_amount,
        status: bid.status,
        created_at: bid.created_at,
      };
    });
  }

  // --- My Bids (includes user's own max_amount) ---
  async getMyBids(userId: string) {
    const client = this.supabase.getClient();
    const { data: bids } = await client
      .from('wimc_bids')
      .select('*, wimc_auctions(id, listing_id, current_price, status, ends_at, reserve_met, wimc_listings(id, name, brand, photos))')
      .eq('bidder_id', userId)
      .order('created_at', { ascending: false });
    return bids || [];
  }

  // --- Admin: List All Auctions (includes reserve_price) ---
  async adminListAuctions() {
    const client = this.supabase.getClient();
    const { data } = await client
      .from('wimc_auctions')
      .select('*, wimc_listings(id, name, brand, photos, seller_id)')
      .order('created_at', { ascending: false });
    return data || [];
  }

  // --- Get Auction for Order Validation ---
  async getAuctionForOrder(auctionId: string) {
    const client = this.supabase.getClient();
    const { data: auction } = await client
      .from('wimc_auctions')
      .select('*')
      .eq('id', auctionId)
      .single();
    return auction;
  }
}
