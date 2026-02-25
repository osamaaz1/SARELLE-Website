'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/providers/toast-provider';
import { ImageGallery } from '@/components/marketplace/image-gallery';
import { OfferModal } from '@/components/marketplace/offer-modal';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function ListingDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [offerOpen, setOfferOpen] = useState(false);
  const [bidOpen, setBidOpen] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [bidError, setBidError] = useState('');
  const [bidLoading, setBidLoading] = useState(false);

  useEffect(() => {
    if (id) {
      api.getListing(id as string)
        .then(setListing)
        .catch(() => addToast('error', 'Listing not found'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) return <LoadingSpinner size="lg" />;
  if (!listing) return <div className="text-center py-20 text-wimc-subtle">Listing not found</div>;

  const fmt = (n: number) => '$' + n.toLocaleString();
  const isBidding = !!listing.bidding;
  const highestBid = listing.bids?.length ? Math.max(...listing.bids.map((b: any) => b.amt)) : 0;
  const discount = listing.original_price
    ? Math.round((1 - listing.price / listing.original_price) * 100)
    : 0;

  const handleBuyNow = () => {
    if (!user) { router.push('/auth/login'); return; }
    router.push(`/checkout/${listing.id}`);
  };

  const handleOffer = async (amount: number) => {
    const key = `offer_${listing.id}_${Date.now()}`;
    await api.createOffer({ listing_id: listing.id, amount, idempotency_key: key });
    addToast('success', 'Offer submitted!');
  };

  const handleBid = async () => {
    const num = parseFloat(bidAmount);
    if (!num || num <= 0) { setBidError('Enter a valid amount'); return; }
    if (highestBid > 0 && num <= highestBid) {
      setBidError(`Bid must be higher than current bid ${fmt(highestBid)}`);
      return;
    }
    if (num < listing.price) {
      setBidError(`Bid must be at least the starting price ${fmt(listing.price)}`);
      return;
    }
    setBidError('');
    setBidLoading(true);
    try {
      // In real app: await api.placeBid({ listing_id: listing.id, amount: num });
      addToast('success', 'Bid placed!');
      setBidOpen(false);
      setBidAmount('');
    } catch (err: any) {
      setBidError(err.message);
    } finally {
      setBidLoading(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8 animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-[13px] text-[#888] hover:text-white transition-colors mb-5 bg-transparent border-none cursor-pointer"
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
          <p className="text-[11px] font-bold tracking-[3px] text-[#555] mb-1.5">{listing.brand}</p>
          <h1 className="font-heading text-[28px] font-semibold leading-[1.3] mb-4">{listing.name}</h1>

          {/* Auction info OR regular price */}
          {isBidding ? (
            <div className="bg-black rounded-[14px] border border-wimc-border p-5 mb-5">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold tracking-[3px] text-white">LIVE AUCTION</span>
                <span className="text-[11px] text-[#555]">{listing.bids?.length || 0} bids</span>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[11px] text-[#555] mb-0.5">Starting price</p>
                  <p className="text-[18px] font-semibold text-[#888]">{fmt(listing.price)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-[#555] mb-0.5">Highest bid</p>
                  <p className="text-[28px] font-extrabold text-white">
                    {highestBid > 0 ? fmt(highestBid) : '—'}
                  </p>
                </div>
              </div>
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
              <span key={i} className="text-[11px] font-semibold px-3.5 py-1.5 bg-wimc-surface-alt rounded-full text-wimc-muted">
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

          {/* Action buttons — auction vs regular */}
          {isBidding ? (
            <Button
              size="md"
              className="w-full"
              onClick={() => {
                if (!user) { router.push('/auth/login'); return; }
                setBidAmount(highestBid > 0 ? String(highestBid + 500) : String(listing.price));
                setBidOpen(true);
              }}
            >
              Place Bid
            </Button>
          ) : (
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

      {/* Bid Modal — auction items only */}
      <Modal open={bidOpen} onClose={() => setBidOpen(false)} title="Place Bid">
        <div className="space-y-4">
          <p className="text-[13px] text-wimc-muted">
            Highest bid: <span className="text-white font-bold">{highestBid > 0 ? fmt(highestBid) : 'None yet'}</span>
          </p>
          <Input
            label="Your Bid"
            type="number"
            placeholder="Enter amount"
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            error={bidError}
          />
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setBidOpen(false)}>Cancel</Button>
            <Button
              onClick={handleBid}
              loading={bidLoading}
              disabled={!bidAmount || parseFloat(bidAmount) <= highestBid}
            >
              Confirm Bid
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
