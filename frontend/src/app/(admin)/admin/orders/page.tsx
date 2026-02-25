'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/providers/toast-provider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const statusColors: Record<string, string> = {
  pending_payment: '#FFBB44', paid: '#88BBFF', processing: '#AA88FF', shipped: '#FF8844',
  delivered: '#44DD66', inspection_window: '#88BBFF', completed: '#44DD66', cancelled: '#FF4444', refunded: '#FF4444',
};

export default function AdminOrdersPage() {
  const { addToast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [shipModal, setShipModal] = useState<any>(null);
  const [tracking, setTracking] = useState('');

  useEffect(() => {
    api.getOrders().then(setOrders).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const updateStatus = async (orderId: string, status: string, trackingNumber?: string) => {
    try {
      await api.updateOrderStatus(orderId, { status, tracking_number: trackingNumber });
      addToast('success', `Order marked as ${status}`);
      const updated = await api.getOrders();
      setOrders(updated);
    } catch (err: any) { addToast('error', err.message); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">Order Management</h1>
      <div className="space-y-3">
        {orders.map((order: any) => (
          <Card key={order.id} className="p-5 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{order.wimc_listings?.name || 'Order'}</p>
              <p className="text-xs text-wimc-subtle">#{order.id.slice(0, 8)} &middot; ${order.total?.toLocaleString()}</p>
            </div>
            <Badge color={statusColors[order.status]}>{order.status.replace(/_/g, ' ')}</Badge>
            <div className="flex gap-2">
              {order.status === 'paid' && (
                <Button size="sm" variant="outline" onClick={() => updateStatus(order.id, 'processing')}>Process</Button>
              )}
              {order.status === 'processing' && (
                <Button size="sm" onClick={() => { setShipModal(order); setTracking(''); }}>Ship</Button>
              )}
              {order.status === 'shipped' && (
                <Button size="sm" variant="success" onClick={() => updateStatus(order.id, 'delivered')}>Mark Delivered</Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={!!shipModal} onClose={() => setShipModal(null)} title="Ship Order">
        <div className="space-y-4">
          <Input label="Tracking Number" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Enter tracking number" />
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setShipModal(null)}>Cancel</Button>
            <Button onClick={() => { updateStatus(shipModal.id, 'shipped', tracking); setShipModal(null); }}>Confirm Shipment</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
