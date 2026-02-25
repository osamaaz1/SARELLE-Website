'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function BuyerDashboardPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getOrders().then(setOrders).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (!user) return null;

  const activeOrders = orders.filter((o) => !['completed', 'cancelled', 'refunded'].includes(o.status));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">Welcome, {user.display_name}</h1>
        <p className="text-wimc-muted mt-1">Your buyer dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Orders" value={orders.length} />
        <StatCard label="Active Orders" value={activeOrders.length} color="#FFBB44" />
        <StatCard label="Points" value={user.points} color="#AA88FF" />
      </div>

      <div className="flex gap-3">
        <Link href="/browse"><Button>Browse Items</Button></Link>
        <Link href="/orders"><Button variant="outline">View Orders</Button></Link>
        <Link href="/offers"><Button variant="outline">My Offers</Button></Link>
      </div>

      {loading ? <LoadingSpinner /> : activeOrders.length > 0 && (
        <div>
          <h2 className="font-heading text-lg font-semibold mb-4">Active Orders</h2>
          <div className="space-y-3">
            {activeOrders.slice(0, 5).map((order: any) => (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <Card hover className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{order.wimc_listings?.name || 'Order'}</p>
                    <p className="text-xs text-wimc-subtle">{order.wimc_listings?.brand}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">${order.total?.toLocaleString()}</p>
                    <p className="text-xs text-wimc-yellow capitalize">{order.status.replace(/_/g, ' ')}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
