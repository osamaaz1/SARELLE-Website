'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { api } from '@/lib/api';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { ProductCard } from '@/components/marketplace/product-card';
import { formatPrice } from '@/lib/currency';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const tierColors: Record<string, string> = {
  Bronze: '#FF8844', Silver: '#AAAAAA', Gold: '#FFBB44', Platinum: '#AA88FF',
};

export default function SellerDashboardPage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.getSubmissions(),
      api.getCloset(user.id).catch(() => []),
      api.getPayouts().catch(() => []),
    ])
      .then(([subs, closetListings, pays]) => {
        setSubmissions(subs);
        setListings(Array.isArray(closetListings) ? closetListings : closetListings?.listings || []);
        setPayouts(Array.isArray(pays) ? pays : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user || loading) return <LoadingSpinner />;

  const totalEarnings = payouts.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  const listedCount = submissions.filter((s: any) => s.stage === 'listed').length;
  const pendingCount = submissions.filter((s: any) => !['listed', 'rejected', 'auth_failed', 'price_rejected'].includes(s.stage)).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">My Products</h1>
        <div className="flex items-center gap-2 mt-2">
          <Badge color={tierColors[user.tier]}>{user.tier}</Badge>
          <span className="text-sm text-wimc-subtle">{user.points} points</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Submissions" value={submissions.length} />
        <StatCard label="Listed Items" value={listedCount} color="#44DD66" />
        <StatCard label="In Pipeline" value={pendingCount} color="#FFBB44" />
        <StatCard label="Total Earnings" value={formatPrice(totalEarnings)} color="#44DD66" />
      </div>

      {/* My Closet — Listed Products */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-semibold">My Closet</h2>
          <Link href="/seller/submit">
            <Button size="sm">Submit New Item</Button>
          </Link>
        </div>

        {listings.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.map((item: any) => (
              <ProductCard
                key={item.id}
                id={item.id}
                name={item.name}
                brand={item.brand}
                price={item.price}
                photos={item.photos || []}
                condition={item.condition}
                category={item.category}
                originalPrice={item.original_price}
                celebrity_id={item.celebrity_id}
                listing_type={item.listing_type}
                auction={item.auction}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No listed items yet"
            description="Items you submit that pass review and authentication will appear here as your closet."
          />
        )}
      </div>
    </div>
  );
}
