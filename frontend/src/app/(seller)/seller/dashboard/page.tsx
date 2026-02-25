'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { api } from '@/lib/api';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const tierColors: Record<string, string> = {
  Bronze: '#FF8844', Silver: '#AAAAAA', Gold: '#FFBB44', Platinum: '#AA88FF',
};

export default function SellerDashboardPage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getSubmissions(), api.getPayouts()])
      .then(([subs, pays]) => { setSubmissions(subs); setPayouts(pays); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!user || loading) return <LoadingSpinner />;

  const totalEarnings = payouts.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  const listedCount = submissions.filter((s: any) => s.stage === 'listed').length;
  const pendingCount = submissions.filter((s: any) => !['listed', 'rejected', 'auth_failed', 'price_rejected'].includes(s.stage)).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">Seller Dashboard</h1>
        <div className="flex items-center gap-2 mt-2">
          <Badge color={tierColors[user.tier]}>{user.tier}</Badge>
          <span className="text-sm text-wimc-subtle">{user.points} points</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Submissions" value={submissions.length} />
        <StatCard label="Listed Items" value={listedCount} color="#44DD66" />
        <StatCard label="In Pipeline" value={pendingCount} color="#FFBB44" />
        <StatCard label="Total Earnings" value={`$${totalEarnings.toLocaleString()}`} color="#44DD66" />
      </div>
    </div>
  );
}
