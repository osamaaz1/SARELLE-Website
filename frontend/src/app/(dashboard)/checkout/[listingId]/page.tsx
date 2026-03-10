'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useToast } from '@/providers/toast-provider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CheckoutBreakdown } from '@/components/marketplace/checkout-breakdown';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatPrice } from '@/lib/currency';
import Image from 'next/image';

export default function CheckoutPage() {
  const { listingId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const [listing, setListing] = useState<any>(null);
  const [auction, setAuction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [address, setAddress] = useState({ street: '', city: '', state: '', zip: '', country: '' });

  const auctionIdParam = searchParams.get('auction_id');

  useEffect(() => {
    if (!listingId) return;
    const load = async () => {
      try {
        const item = await api.getListing(listingId as string);
        setListing(item);

        // Check if this is an auction checkout
        if (auctionIdParam || item?.bidding || item?.listing_type === 'auction') {
          const auctionData = await api.getAuction(listingId as string);
          if (auctionData) setAuction(auctionData);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [listingId, auctionIdParam]);

  if (loading) return <LoadingSpinner />;
  if (!listing) return <div className="text-center py-20 text-wimc-subtle">Listing not found</div>;

  // Use auction winning price if this is an auction checkout
  const isAuctionCheckout = !!(auction && auction.status === 'ended' && auction.current_price);
  const itemPrice = isAuctionCheckout ? auction.current_price : listing.price;
  const serviceFee = Math.round(itemPrice * 0.20 * 100) / 100;
  const shippingFee = 50;
  const total = itemPrice + serviceFee + shippingFee;

  const handleCheckout = async () => {
    if (!address.street || !address.city || !address.zip) {
      addToast('error', 'Please fill in your shipping address');
      return;
    }
    setSubmitting(true);
    try {
      const key = `order_${listing.id}_${Date.now()}`;
      await api.createOrder({
        listing_id: listing.id,
        shipping_address: address,
        idempotency_key: key,
        ...(isAuctionCheckout ? { auction_id: auction.id } : {}),
      });
      addToast('success', 'Order placed successfully!');
      router.push('/orders');
    } catch (err: any) {
      addToast('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6">
      <h1 className="font-heading text-2xl font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          {/* Item preview */}
          <div className="flex items-center gap-4 p-4 bg-wimc-surface border border-wimc-border rounded-xl">
            {listing.photos?.[0] && <Image src={listing.photos[0]} alt="" width={80} height={80} className="w-20 h-20 rounded-lg object-cover" unoptimized />}
            <div>
              <p className="text-xs text-wimc-subtle uppercase">{listing.brand}</p>
              <p className="font-medium">{listing.name}</p>
              {isAuctionCheckout && (
                <p className="text-xs text-green-400 mt-1 font-semibold">Auction Winner</p>
              )}
            </div>
          </div>

          {/* Auction info banner */}
          {isAuctionCheckout && (
            <div className="bg-green-900/20 border border-green-800 rounded-xl p-4">
              <p className="text-sm text-green-400 font-semibold mb-1">You won this auction!</p>
              <p className="text-xs text-green-400/70">
                Your winning bid: {formatPrice(auction.current_price)}. Please complete checkout within 48 hours.
              </p>
            </div>
          )}

          {/* Shipping Address */}
          <div className="space-y-4">
            <h3 className="font-heading font-semibold text-lg">Shipping Address</h3>
            <Input label="Street" value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} required />
            <Input label="City" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} required />
            <Input label="State / Governorate" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="ZIP / Postal Code" value={address.zip} onChange={(e) => setAddress({ ...address, zip: e.target.value })} required />
              <Input label="Country" value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Order summary */}
        <div className="space-y-4">
          <CheckoutBreakdown itemPrice={itemPrice} serviceFee={serviceFee} shippingFee={shippingFee} total={total} />
          <Button className="w-full" size="lg" loading={submitting} onClick={handleCheckout}>
            Place Order — {formatPrice(total)}
          </Button>
          <p className="text-xs text-wimc-subtle text-center">Secure checkout. 3-day buyer protection included.</p>
        </div>
      </div>
    </div>
  );
}
