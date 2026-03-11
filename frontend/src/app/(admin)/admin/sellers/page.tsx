'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';

const tierColors: Record<string, string> = {
  Bronze: '#FF8844', Silver: '#AAAAAA', Gold: '#FFBB44', Platinum: '#AA88FF',
};

export default function AdminSellersPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAdminSellers().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">Seller Management</h1>
      {!data?.sellers?.length ? (
        <EmptyState title="No sellers" description="Registered sellers will appear here" />
      ) : (
        <div className="space-y-3">
          {data.sellers.map((seller: any) => (
            <Card key={seller.id} className="p-5 flex items-center gap-4">
              <Avatar src={seller.avatar_url} name={seller.display_name} />
              <div className="flex-1">
                <p className="font-medium text-sm">{seller.display_name}</p>
                <p className="text-xs text-wimc-subtle">{seller.phone || 'No phone'} &middot; {seller.points} pts</p>
              </div>
              <Badge color={tierColors[seller.tier]}>{seller.tier}</Badge>
              <Badge color={seller.role === 'celebrity' ? '#AA88FF' : '#666'}>{seller.role}</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
