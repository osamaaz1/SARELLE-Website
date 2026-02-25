'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckoutBreakdown } from '@/components/marketplace/checkout-breakdown';
import { OrderStatusTimeline } from '@/components/marketplace/order-status-timeline';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) api.getOrder(id as string).then(setOrder).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!order) return <div className="text-center py-20 text-wimc-subtle">Order not found</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">Order Details</h1>
        <p className="text-xs text-wimc-subtle mt-1">Order #{order.id.slice(0, 8)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-heading font-semibold mb-4">Item</h3>
          <div className="flex items-center gap-3">
            {order.wimc_listings?.photos?.[0] && (
              <img src={order.wimc_listings.photos[0]} alt="" className="w-20 h-20 rounded-lg object-cover" />
            )}
            <div>
              <p className="font-medium">{order.wimc_listings?.name}</p>
              <p className="text-sm text-wimc-subtle">{order.wimc_listings?.brand} &middot; {order.wimc_listings?.category}</p>
            </div>
          </div>
          {order.tracking_number && (
            <div className="mt-4 p-3 bg-wimc-surface-alt rounded-lg">
              <p className="text-xs text-wimc-subtle">Tracking Number</p>
              <p className="text-sm font-mono">{order.tracking_number}</p>
            </div>
          )}
        </Card>

        <CheckoutBreakdown
          itemPrice={order.item_price}
          serviceFee={order.service_fee}
          shippingFee={order.shipping_fee}
          total={order.total}
        />
      </div>

      <Card className="p-6">
        <h3 className="font-heading font-semibold mb-4">Status</h3>
        <OrderStatusTimeline currentStatus={order.status} events={order.wimc_order_events} />
      </Card>
    </div>
  );
}
