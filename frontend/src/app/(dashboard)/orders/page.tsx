'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { formatPrice } from '@/lib/currency';
import Image from 'next/image';

const statusColors: Record<string, string> = {
  pending_payment: '#FFBB44',
  paid: '#88BBFF',
  processing: '#AA88FF',
  shipped: '#FF8844',
  delivered: '#44DD66',
  inspection_window: '#88BBFF',
  completed: '#44DD66',
  cancelled: '#FF4444',
  refunded: '#FF4444',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getOrders().then(setOrders).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">My Orders</h1>
      {orders.length === 0 ? (
        <EmptyState title="No orders yet" description="Browse the marketplace to find your next luxury item" />
      ) : (
        <div className="space-y-3">
          {orders.map((order: any) => (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <Card hover className="p-5 flex items-center gap-4">
                {order.wimc_listings?.photos?.[0] && (
                  <Image src={order.wimc_listings.photos[0]} alt="" width={64} height={64} className="w-16 h-16 rounded-lg object-cover" unoptimized />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{order.wimc_listings?.name || 'Item'}</p>
                  <p className="text-xs text-wimc-subtle">{order.wimc_listings?.brand} &middot; {new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-heading font-bold">{formatPrice(order.total)}</p>
                  <Badge color={statusColors[order.status]}>{order.status.replace(/_/g, ' ')}</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
