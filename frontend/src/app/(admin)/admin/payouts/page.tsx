'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/providers/toast-provider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';

const statusColors: Record<string, string> = {
  pending: '#FFBB44', scheduled: '#88BBFF', processing: '#AA88FF', sent: '#44DD66', failed: '#FF4444',
};

export default function AdminPayoutsPage() {
  const { addToast } = useToast();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [eligibleOrders, setEligibleOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    api.getAdminPayouts().then(setPayouts).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, []);

  const handleTrigger = async (orderId: string) => {
    try {
      await api.triggerPayout(orderId);
      addToast('success', 'Payout triggered');
      fetchData();
    } catch (err: any) { addToast('error', err.message); }
  };

  const handleMarkSent = async (payoutId: string) => {
    try {
      await api.updatePayoutStatus(payoutId, 'sent');
      addToast('success', 'Payout marked as sent');
      fetchData();
    } catch (err: any) { addToast('error', err.message); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">Payout Management</h1>
      {payouts.length === 0 ? (
        <EmptyState title="No payouts" description="Payouts appear after orders complete the inspection window" />
      ) : (
        <div className="space-y-3">
          {payouts.map((payout: any) => (
            <Card key={payout.id} className="p-5 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-medium text-sm">{payout.wimc_profiles?.display_name || 'Seller'}</p>
                <p className="text-xs text-wimc-subtle">Commission: {payout.commission_rate}% (${payout.commission_amount?.toLocaleString()})</p>
              </div>
              <div className="text-right">
                <p className="font-heading font-bold">${payout.amount?.toLocaleString()}</p>
                <Badge color={statusColors[payout.status]}>{payout.status}</Badge>
              </div>
              <div className="flex gap-2">
                {payout.status === 'pending' && (
                  <Button size="sm" variant="success" onClick={() => handleMarkSent(payout.id)}>Mark Sent</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
