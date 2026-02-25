'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/providers/toast-provider';

const statusColors: Record<string, string> = {
  pending: '#FFBB44', accepted: '#44DD66', rejected: '#FF4444', expired: '#666', withdrawn: '#666',
};

export default function SentOffersPage() {
  const { addToast } = useToast();
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOffers = () => {
    api.getSentOffers().then(setOffers).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchOffers(); }, []);

  const handleWithdraw = async (offerId: string) => {
    try {
      await api.withdrawOffer(offerId);
      addToast('success', 'Offer withdrawn');
      fetchOffers();
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">My Offers</h1>
      {offers.length === 0 ? (
        <EmptyState title="No offers yet" description="Make offers on items you're interested in" />
      ) : (
        <div className="space-y-3">
          {offers.map((offer: any) => (
            <Card key={offer.id} className="p-5 flex items-center gap-4">
              {offer.wimc_listings?.photos?.[0] && (
                <img src={offer.wimc_listings.photos[0]} alt="" className="w-14 h-14 rounded-lg object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{offer.wimc_listings?.name}</p>
                <p className="text-xs text-wimc-subtle">Listed at ${offer.wimc_listings?.price?.toLocaleString()}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-heading font-bold">${offer.amount?.toLocaleString()}</p>
                <Badge color={statusColors[offer.status]}>{offer.status}</Badge>
              </div>
              {offer.status === 'pending' && (
                <Button variant="ghost" size="sm" onClick={() => handleWithdraw(offer.id)}>Withdraw</Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
