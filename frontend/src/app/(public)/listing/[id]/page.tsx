'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/providers/toast-provider';
import { useSocket } from '@/providers/socket-provider';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatPrice, CURRENCY_SYMBOL } from '@/lib/currency';

const ImageGallery = dynamic(() => import('@/components/marketplace/image-gallery').then(m => ({ default: m.ImageGallery })));
const OfferModal = dynamic(() => import('@/components/marketplace/offer-modal').then(m => ({ default: m.OfferModal })));
const Modal = dynamic(() => import('@/components/ui/modal').then(m => ({ default: m.Modal })));

function useCountdown(endTime: string | null) {
  const [timeLeft, setTimeLeft] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!endTime) return;
    const update = () => {
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Ended'); setExpired(true); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`);
      setExpired(false);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return { timeLeft, expired };
}

export default function ListingDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();
  const { on, off, emit } = useSocket();
  const [listing, setListing] = useState<any>(null);
  const [auction, setAuction] = useState<any>(null);
  const [bidHistory, setBidHistory] = useState<any[]>([]);
  const [myBid, setMyBid] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [offerOpen, setOfferOpen] = useState(false);
  const [bidOpen, setBidOpen] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [bidError, setBidError] = useState('');
  const [bidLoading, setBidLoading] = useState(false);

  const { timeLeft, expired } = useCountdown(auction?.ends_at || null);

  // Load listing + auction data
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const item = await api.getListing(id as string);
        setListing(item);
        if (item?.celebrity_id || item?.bidding || item?.listing_type === 'auction') {
          const auctionData = await api.getAuction(id as string).catch(() => null);
          if (auctionData) {
            setAuction(auctionData);
            const hist = await api.getAuctionHistory(auctionData.id).catch(() => []);
            setBidHistory(hist || []);
            // Load user's own bid for this auction
            if (user) {
              try {
                const allMyBids = await api.getMyBids();
                const mine = allMyBids?.find((b: any) => b.auction_id === auctionData.id);
                if (mine) setMyBid(mine);
              } catch {}
            }
          }
        }
      } catch {
        addToast('error', 'Listing not found');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // WebSocket: join/leave auction room
  useEffect(() => {
    if (!auction?.id) return;
    emit('auction:join', auction.id);
    return () => { emit('auction:leave', auction.id); };
  }, [auction?.id, emit]);

  // WebSocket: listen for real-time bid updates
  const handleBidPlaced = useCallback((data: any) => {
    setAuction((prev: any) => prev ? {
      ...prev,
      current_price: data.current_price,
      bid_count: data.bid_count,
      reserve_met: data.reserve_met,
      ends_at: data.ends_at,
    } : prev);
    // Refresh bid history
    if (auction?.id) {
      api.getAuctionHistory(auction.id).then(h => setBidHistory(h || []));
    }
  }, [auction?.id]);

  const handleOutbid = useCallback((data: any) => {
    addToast('info', `You've been outbid! Current price: ${formatPrice(data.current_price)}`);
  }, [addToast]);

  const handleAuctionEnded = useCallback((data: any) => {
    setAuction((prev: any) => prev ? { ...prev, status: 'ended' } : prev);
    if (data.winner_id && data.winner_id === user?.id) {
      addToast('success', 'Congratulations! You won the auction!');
    } else if (data.winning_price) {
      addToast('info', `Auction ended. Final price: ${formatPrice(data.winning_price)}`);
    } else {
      addToast('info', 'Auction ended without a winner.');
    }
  }, [user?.id, addToast]);

  useEffect(() => {
    on('auction:bidPlaced', handleBidPlaced);
    on('auction:outbid', handleOutbid);
    on('auction:ended', handleAuctionEnded);
    return () => {
      off('auction:bidPlaced', handleBidPlaced);
      off('auction:outbid', handleOutbid);
      off('auction:ended', handleAuctionEnded);
    };
  }, [on, off, handleBidPlaced, handleOutbid, handleAuctionEnded]);

  if (loading) return <LoadingSpinner size="lg" />;
  if (!listing) return <div className="text-center py-20 text-wimc-subtle">Listing not found</div>;

  const fmt = formatPrice;
  const isAuction = !!(auction && auction.status === 'active');
  const isEndedAuction = auction?.status === 'ended';
  const currentPrice = auction?.current_price || listing.price;
  const bidCount = auction?.bid_count || 0;
  const isOwnListing = user?.id === listing.seller_id;
  const hasCelebrity = !!listing.celebrity_id;
  const discount = listing.original_price
    ? Math.round((1 - listing.price / listing.original_price) * 100)
    : 0;

  const getMinBid = () => {
    if (!auction) return listing.price;
    const price = auction.current_price || auction.starting_price;
    // Increment tiers (EGP)
    let increment = 100;
    if (price < 100) increment = 1;
    else if (price < 500) increment = 5;
    else if (price < 1000) increment = 10;
    else if (price < 5000) increment = 25;
    else if (price < 25000) increment = 50;
    return bidCount > 0 ? price + increment : price;
  };

  const handleBuyNow = () => {
    if (!user) { router.push('/auth/login'); return; }
    if (isEndedAuction && auction.current_winner_id === user.id) {
      router.push(`/checkout/${listing.id}?auction_id=${auction.id}`);
    } else {
      router.push(`/checkout/${listing.id}`);
    }
  };

  const handleOffer = async (amount: number) => {
    const key = `offer_${listing.id}_${Date.now()}`;
    await api.createOffer({ listing_id: listing.id, amount, idempotency_key: key });
    addToast('success', 'Offer submitted!');
  };

  const handleBid = async () => {
    const num = parseFloat(bidAmount);
    const minBid = getMinBid();
    if (!num || num <= 0) { setBidError('Enter a valid amount'); return; }
    if (num < minBid) {
      setBidError(`Your maximum bid must be at least ${fmt(minBid)}`);
      return;
    }
    setBidError('');
    setBidLoading(true);
    try {
      const result = await api.placeBid({ auction_id: auction.id, max_amount: num });
      if (result.status === 'winning') {
        addToast('success', result.message || "You're the highest bidder!");
      } else {
        addToast('info', result.message || "You've been outbid.");
      }
      // Update auction state from response
      setAuction((prev: any) => ({
        ...prev,
        current_price: result.current_price,
        bid_count: result.bid_count,
        reserve_met: result.reserve_met ?? prev.reserve_met,
        ends_at: result.ends_at ?? prev.ends_at,
      }));
      // Save user's bid info
      setMyBid({ max_amount: num, status: result.status });
      setBidOpen(false);
      setBidAmount('');
      // Refresh history
      const hist = await api.getAuctionHistory(auction.id);
      setBidHistory(hist || []);
    } catch (err: any) {
      setBidError(err.message);
    } finally {
      setBidLoading(false);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8 animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-[14px] text-[#888] hover:text-white transition-colors mb-5 bg-transparent border-none cursor-pointer py-2 -ml-1 pl-1 min-h-[44px]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Images */}
        <ImageGallery photos={listing.photos || []} name={listing.name} />

        {/* Details */}
        <div>
          <p className="text-[12px] font-bold tracking-[3px] text-[#555] mb-1.5">{listing.brand}</p>
          <h1 className="font-heading text-[28px] font-semibold leading-[1.3] mb-4">{listing.name}</h1>

          {/* Auction info — celebrity items only */}
          {hasCelebrity && (isAuction || isEndedAuction) ? (
            <div className="bg-black rounded-[14px] border border-wimc-border p-5 mb-5">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold tracking-[3px] ${isEndedAuction ? 'text-[#888]' : 'text-white'}`}>
                    {isEndedAuction ? 'AUCTION ENDED' : 'LIVE AUCTION'}
                  </span>
                  {/* Reserve indicator for celebrity listings */}
                  {hasCelebrity && auction && (
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      auction.reserve_met
                        ? 'bg-green-900/50 text-green-400 border border-green-800'
                        : 'bg-amber-900/50 text-amber-400 border border-amber-800'
                    }`}>
                      {auction.reserve_met ? 'Reserve Met' : 'Reserve Not Yet Met'}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[#555]">{bidCount} bid{bidCount !== 1 ? 's' : ''}</span>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[11px] text-[#555] mb-0.5">Starting price</p>
                  <p className="text-[18px] font-semibold text-[#888]">{fmt(auction?.starting_price || listing.price)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-[#555] mb-0.5">Current price</p>
                  <p className="text-[28px] font-extrabold text-white">
                    {bidCount > 0 ? fmt(currentPrice) : '\u2014'}
                  </p>
                </div>
              </div>

              {/* Countdown timer */}
              {isAuction && (
                <div className="mt-3 pt-3 border-t border-wimc-border flex items-center justify-between">
                  <span className="text-[11px] text-[#555]">Time remaining</span>
                  <span className={`text-[14px] font-bold tabular-nums ${
                    expired ? 'text-[#888]' : timeLeft.startsWith('0h') ? 'text-wimc-red' : 'text-white'
                  }`}>
                    {timeLeft}
                  </span>
                </div>
              )}

              {/* User's own bid status — only visible to the bidder */}
              {myBid && (
                <div className="mt-3 pt-3 border-t border-wimc-border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-[#555]">Your max bid</span>
                    <span className="text-[16px] font-bold text-white">{fmt(myBid.max_amount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[12px] font-semibold ${
                      myBid.status === 'winning' ? 'text-green-400' : 'text-amber-400'
                    }`}>
                      {myBid.status === 'winning' ? "You're winning!" : "You've been outbid"}
                    </span>
                    <span className="text-[10px] text-[#444]">Only you can see this</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-baseline gap-2 mb-5">
              <span className="text-[28px] font-bold">{fmt(listing.price)}</span>
              {listing.original_price && (
                <>
                  <span className="text-[16px] text-[#444] line-through">{fmt(listing.original_price)}</span>
                  <span className="text-[14px] font-bold text-wimc-red">-{discount}%</span>
                </>
              )}
            </div>
          )}

          {/* Tags */}
          <div className="flex gap-1.5 flex-wrap mb-5">
            {[listing.condition, listing.category].filter(Boolean).map((tag: string, i: number) => (
              <span key={i} className="text-[13px] font-semibold px-4 py-2 bg-wimc-surface-alt rounded-full text-wimc-muted">
                {tag}
              </span>
            ))}
          </div>

          {/* Trust signals */}
          <div className="border-t border-wimc-border pt-4 mb-6">
            {['Authenticity guaranteed', 'Quality checked', 'Free shipping'].map((text, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#44DD66" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span className="text-[13px] text-wimc-muted">{text}</span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          {isOwnListing ? (
            <div className="bg-wimc-surface-alt rounded-lg px-4 py-3 text-sm text-wimc-muted text-center">
              This is your listing
            </div>
          ) : hasCelebrity ? (
            /* Celebrity items: Auction/Bid ONLY */
            isAuction ? (
              <div className="space-y-2">
                <Button
                  size="md"
                  className="w-full"
                  onClick={() => {
                    if (!user) { router.push('/auth/login'); return; }
                    setBidAmount(String(getMinBid()));
                    setBidOpen(true);
                  }}
                >
                  Place Bid
                </Button>
                <p className="text-[11px] text-[#555] text-center">
                  Proxy bidding: we bid on your behalf up to your secret maximum.
                </p>
              </div>
            ) : isEndedAuction && auction?.current_winner_id === user?.id ? (
              <Button size="md" className="w-full" onClick={handleBuyNow}>
                Complete Purchase — {fmt(currentPrice)}
              </Button>
            ) : isEndedAuction ? (
              <div className="bg-wimc-surface-alt rounded-lg px-4 py-3 text-sm text-wimc-muted text-center">
                Auction ended
              </div>
            ) : null
          ) : (
            /* Regular items: Buy Now + Make Offer ONLY */
            <div className="flex gap-2.5">
              <Button
                variant="outline"
                size="md"
                className="flex-1"
                onClick={() => {
                  if (!user) { router.push('/auth/login'); return; }
                  setOfferOpen(true);
                }}
              >
                Make Offer
              </Button>
              <Button size="md" className="flex-1" onClick={handleBuyNow}>
                Buy — {fmt(listing.price)}
              </Button>
            </div>
          )}

          {listing.description && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-wimc-muted mb-2">Description</h3>
              <p className="text-sm text-wimc-subtle leading-relaxed">{listing.description}</p>
            </div>
          )}

          {/* Bid History — celebrity auctions only */}
          {hasCelebrity && (isAuction || isEndedAuction) && bidHistory.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-wimc-muted mb-3">Bid History</h3>
              <div className="space-y-2">
                {bidHistory.slice(0, 10).map((bid: any) => (
                  <div key={bid.id} className="flex items-center justify-between py-2 border-b border-wimc-border last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-mono text-wimc-muted">{bid.bidder_name}</span>
                      {bid.status === 'winning' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-900/50 text-green-400">LEADING</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[14px] font-semibold">{fmt(bid.amount)}</span>
                      <span className="text-[11px] text-[#555] ml-2">{formatTimeAgo(bid.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Offer Modal — regular items only */}
      <OfferModal
        open={offerOpen}
        onClose={() => setOfferOpen(false)}
        listingName={listing.name}
        listingPrice={listing.price}
        onSubmit={handleOffer}
      />

      {/* Proxy Bid Modal — auction items */}
      <Modal open={bidOpen} onClose={() => setBidOpen(false)} title="Place Your Maximum Bid">
        <div className="space-y-4">
          <div className="bg-wimc-surface-alt rounded-lg p-3 text-[13px] text-wimc-muted leading-relaxed">
            We&apos;ll bid on your behalf with the minimum amount needed — up to your maximum.
            Your maximum bid is kept <span className="text-white font-semibold">secret</span>.
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="text-wimc-muted">Current price:</span>
            <span className="text-white font-bold">{bidCount > 0 ? fmt(currentPrice) : 'No bids yet'}</span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="text-wimc-muted">Minimum bid:</span>
            <span className="text-white font-bold">{fmt(getMinBid())}</span>
          </div>
          <Input
            label={`Your Maximum Bid (${CURRENCY_SYMBOL})`}
            type="number"
            placeholder={`${getMinBid()} or more`}
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            error={bidError}
          />
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setBidOpen(false)}>Cancel</Button>
            <Button
              onClick={handleBid}
              loading={bidLoading}
              disabled={!bidAmount || parseFloat(bidAmount) < getMinBid()}
            >
              Confirm Bid
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
