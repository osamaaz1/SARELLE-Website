'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { StatCard } from '@/components/ui/stat-card';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const stageColors: Record<string, string> = {
  pending_review: '#FFBB44', price_suggested: '#88BBFF', price_accepted: '#44DD66',
  pickup_scheduled: '#FF8844', driver_dispatched: '#AA88FF', arrived_at_office: '#88BBFF',
  auth_passed: '#44DD66', auth_failed: '#FF4444', photoshoot_done: '#AA88FF', listed: '#44DD66',
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAdminDashboard().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      <h1 className="font-heading text-2xl font-bold">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard label="Submissions" value={data?.stats?.totalSubmissions || 0} color="#FFBB44" />
        <StatCard label="Active Listings" value={data?.stats?.totalListings || 0} color="#44DD66" />
        <StatCard label="Orders" value={data?.stats?.totalOrders || 0} color="#88BBFF" />
        <StatCard label="Payouts" value={data?.stats?.totalPayouts || 0} color="#AA88FF" />
        <StatCard label="Revenue" value={`$${(data?.stats?.revenue || 0).toLocaleString()}`} color="#FF4444" />
      </div>

      <Card className="p-6">
        <h2 className="font-heading text-lg font-semibold mb-4">Pipeline Overview</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(data?.pipeline || {}).map(([stage, count]: [string, any]) => (
            <div key={stage} className="flex items-center gap-2 bg-wimc-surface-alt rounded-lg px-4 py-2">
              <Badge color={stageColors[stage] || '#666'}>{stage.replace(/_/g, ' ')}</Badge>
              <span className="text-lg font-bold">{count}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
