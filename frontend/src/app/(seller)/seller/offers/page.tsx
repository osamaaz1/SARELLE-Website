'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/providers/toast-provider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { formatPrice } from '@/lib/currency';
import Image from 'next/image';

export default function SellerOffersPage() {
  const { addToast } = useToast();
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOffers = () => {
    api.getReceivedOffers().then(setOffers).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { fetchOffers(); }, []);

  const handleAccept = async (offerId: string) => {
    try {
      await api.acceptOffer(offerId);
      addToast('success', 'Offer accepted!');
      fetchOffers();
    } catch (err: any) { addToast('error', err.message); }
  };

  const handleReject = async (offerId: string) => {
    try {
      await api.rejectOffer(offerId);
      addToast('info', 'Offer rejected');
      fetchOffers();
    } catch (err: any) { addToast('error', err.message); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">Received Offers</h1>
      {offers.length === 0 ? (
        <EmptyState title="No offers yet" description="Offers from buyers will appear here" />
      ) : (
        <div className="space-y-3">
          {offers.map((offer: any) => (
            <Card key={offer.id} className="p-5">
              <div className="flex items-center gap-4">
                {offer.wimc_listings?.photos?.[0] && (
                  <Image src={offer.wimc_listings.photos[0]} alt="" width={56} height={56} className="w-14 h-14 rounded-lg object-cover" unoptimized />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{offer.wimc_listings?.name}</p>
                  <p className="text-xs text-wimc-subtle">Listed at {formatPrice(offer.wimc_listings?.price)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-heading font-bold text-wimc-yellow">{formatPrice(offer.amount)}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Avatar src={offer.wimc_profiles?.avatar_url} name={offer.wimc_profiles?.display_name || 'Buyer'} size="sm" />
                      <span className="text-xs text-wimc-subtle">{offer.wimc_profiles?.display_name}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleAccept(offer.id)}>Accept</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleReject(offer.id)}>Reject</Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
