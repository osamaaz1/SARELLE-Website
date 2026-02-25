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
import { EmptyState } from '@/components/ui/empty-state';

export default function AdminPickupsPage() {
  const { addToast } = useToast();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleModal, setScheduleModal] = useState<any>(null);
  const [pickupForm, setPickupForm] = useState({ pickup_date: '', pickup_time: '', pickup_address: '', driver_phone: '', google_maps_link: '' });

  const fetchData = () => {
    setLoading(true);
    api.getAdminSubmissions('price_accepted')
      .then((accepted) => {
        return Promise.all([
          api.getAdminSubmissions('pickup_scheduled'),
          api.getAdminSubmissions('driver_dispatched'),
        ]).then(([scheduled, dispatched]) => {
          setSubmissions([...accepted, ...scheduled, ...dispatched]);
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, []);

  const handleSchedule = async () => {
    try {
      await api.schedulePickup({ submission_id: scheduleModal.id, ...pickupForm });
      addToast('success', 'Pickup scheduled');
      setScheduleModal(null);
      fetchData();
    } catch (err: any) { addToast('error', err.message); }
  };

  const handleDispatch = async (id: string) => {
    try { await api.dispatchDriver(id); addToast('success', 'Driver dispatched'); fetchData(); }
    catch (err: any) { addToast('error', err.message); }
  };

  const handleArrived = async (id: string) => {
    try { await api.markArrived(id); addToast('success', 'Marked as arrived'); fetchData(); }
    catch (err: any) { addToast('error', err.message); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">Pickup Management</h1>
      {submissions.length === 0 ? (
        <EmptyState title="No pickups" description="Items with accepted prices will appear here for pickup scheduling" />
      ) : (
        <div className="space-y-3">
          {submissions.map((sub: any) => (
            <Card key={sub.id} className="p-5 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-medium text-sm">{sub.name}</p>
                <p className="text-xs text-wimc-subtle">{sub.brand} &middot; Seller: {sub.seller_id?.slice(0, 8)}</p>
              </div>
              <Badge color={sub.stage === 'price_accepted' ? '#44DD66' : sub.stage === 'pickup_scheduled' ? '#FF8844' : '#AA88FF'}>
                {sub.stage.replace(/_/g, ' ')}
              </Badge>
              <div className="flex gap-2">
                {sub.stage === 'price_accepted' && (
                  <Button size="sm" onClick={() => setScheduleModal(sub)}>Schedule Pickup</Button>
                )}
                {sub.stage === 'pickup_scheduled' && (
                  <Button size="sm" variant="outline" onClick={() => handleDispatch(sub.id)}>Dispatch Driver</Button>
                )}
                {sub.stage === 'driver_dispatched' && (
                  <Button size="sm" variant="success" onClick={() => handleArrived(sub.id)}>Mark Arrived</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!scheduleModal} onClose={() => setScheduleModal(null)} title="Schedule Pickup">
        <div className="space-y-4">
          <Input label="Pickup Date" type="date" value={pickupForm.pickup_date} onChange={(e) => setPickupForm({ ...pickupForm, pickup_date: e.target.value })} />
          <Input label="Pickup Time" value={pickupForm.pickup_time} onChange={(e) => setPickupForm({ ...pickupForm, pickup_time: e.target.value })} placeholder="e.g., 2:00 PM - 4:00 PM" />
          <Input label="Pickup Address" value={pickupForm.pickup_address} onChange={(e) => setPickupForm({ ...pickupForm, pickup_address: e.target.value })} />
          <Input label="Driver Phone" value={pickupForm.driver_phone} onChange={(e) => setPickupForm({ ...pickupForm, driver_phone: e.target.value })} />
          <Input label="Google Maps Link (optional)" value={pickupForm.google_maps_link} onChange={(e) => setPickupForm({ ...pickupForm, google_maps_link: e.target.value })} />
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setScheduleModal(null)}>Cancel</Button>
            <Button onClick={handleSchedule}>Schedule</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
