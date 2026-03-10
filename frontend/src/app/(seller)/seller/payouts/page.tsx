'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { formatPrice } from '@/lib/currency';

const statusColors: Record<string, string> = {
  pending: '#FFBB44', scheduled: '#88BBFF', processing: '#AA88FF', sent: '#44DD66', failed: '#FF4444',
};

export default function SellerPayoutsPage() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPayouts().then(setPayouts).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const totalEarned = payouts.filter((p: any) => p.status === 'sent').reduce((sum: number, p: any) => sum + p.amount, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold">Payouts</h1>
        <div className="text-right">
          <p className="text-xs text-wimc-subtle">Total Earned</p>
          <p className="font-heading text-xl font-bold text-wimc-green">{formatPrice(totalEarned)}</p>
        </div>
      </div>
      {payouts.length === 0 ? (
        <EmptyState title="No payouts yet" description="Payouts will appear after your items are sold and the inspection window closes" />
      ) : (
        <div className="space-y-3">
          {payouts.map((payout: any) => (
            <Card key={payout.id} className="p-5 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{payout.wimc_orders?.wimc_listings?.name || 'Order'}</p>
                <p className="text-xs text-wimc-subtle">{new Date(payout.created_at).toLocaleDateString()} &middot; {payout.commission_rate}% commission</p>
              </div>
              <div className="text-right">
                <p className="font-heading font-bold">{formatPrice(payout.amount)}</p>
                <Badge color={statusColors[payout.status]}>{payout.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
