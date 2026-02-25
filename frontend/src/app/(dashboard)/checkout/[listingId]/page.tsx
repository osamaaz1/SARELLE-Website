'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useToast } from '@/providers/toast-provider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CheckoutBreakdown } from '@/components/marketplace/checkout-breakdown';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function CheckoutPage() {
  const { listingId } = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [address, setAddress] = useState({ street: '', city: '', state: '', zip: '', country: '' });

  useEffect(() => {
    if (listingId) {
      api.getListing(listingId as string).then(setListing).catch(() => {}).finally(() => setLoading(false));
    }
  }, [listingId]);

  if (loading) return <LoadingSpinner />;
  if (!listing) return <div className="text-center py-20 text-wimc-subtle">Listing not found</div>;

  const serviceFee = Math.round(listing.price * 0.20 * 100) / 100;
  const shippingFee = 50;
  const total = listing.price + serviceFee + shippingFee;

  const handleCheckout = async () => {
    if (!address.street || !address.city || !address.zip) {
      addToast('error', 'Please fill in your shipping address');
      return;
    }
    setSubmitting(true);
    try {
      const key = `order_${listing.id}_${Date.now()}`;
      await api.createOrder({ listing_id: listing.id, shipping_address: address, idempotency_key: key });
      addToast('success', 'Order placed successfully!');
      router.push('/orders');
    } catch (err: any) {
      addToast('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="font-heading text-2xl font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-wimc-surface border border-wimc-border rounded-xl">
            {listing.photos?.[0] && <img src={listing.photos[0]} alt="" className="w-20 h-20 rounded-lg object-cover" />}
            <div>
              <p className="text-xs text-wimc-subtle uppercase">{listing.brand}</p>
              <p className="font-medium">{listing.name}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-heading font-semibold">Shipping Address</h3>
            <Input label="Street" value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} required />
            <div className="grid grid-cols-2 gap-3">
              <Input label="City" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} required />
              <Input label="State" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="ZIP Code" value={address.zip} onChange={(e) => setAddress({ ...address, zip: e.target.value })} required />
              <Input label="Country" value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <CheckoutBreakdown itemPrice={listing.price} serviceFee={serviceFee} shippingFee={shippingFee} total={total} />
          <Button className="w-full" size="lg" loading={submitting} onClick={handleCheckout}>
            Place Order — ${total.toLocaleString()}
          </Button>
          <p className="text-xs text-wimc-subtle text-center">Secure checkout. 3-day buyer protection included.</p>
        </div>
      </div>
    </div>
  );
}
