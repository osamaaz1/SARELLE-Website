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
import { STAGES } from '@/lib/submission-stages';
import { Calendar, Clock, MapPin, Phone, MessageSquare, ExternalLink } from 'lucide-react';

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
}

export default function AdminPickupsPage() {
  const { addToast } = useToast();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<any>(null);
  const [rejectForm, setRejectForm] = useState({
    admin_suggested_date: '',
    admin_suggested_time_from: '',
    admin_suggested_time_to: '',
    admin_pickup_notes: '',
  });
  const [acting, setActing] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.getAdminSubmissions('pickup_proposed'),
      api.getAdminSubmissions('pickup_counter'),
      api.getAdminSubmissions('pickup_confirmed'),
      api.getAdminSubmissions('driver_dispatched'),
    ])
      .then(([proposed, counter, confirmed, dispatched]) => {
        setSubmissions([...proposed, ...counter, ...confirmed, ...dispatched]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, []);

  // Helper: optimistically update a submission's stage in local state
  const updateLocalStage = (id: string, newStage: string, extraFields?: Record<string, any>) => {
    setSubmissions(prev => prev.map(s =>
      s.id === id ? { ...s, stage: newStage, ...extraFields } : s
    ));
  };

  // Helper: remove a submission from local state (when it moves to a stage we don't fetch)
  const removeLocal = (id: string) => {
    setSubmissions(prev => prev.filter(s => s.id !== id));
  };

  const handleAccept = async (id: string) => {
    if (!window.confirm('Accept this pickup proposal?')) return;
    setActing(id);
    try {
      await api.respondToPickup(id, { action: 'accept' });
      addToast('success', 'Pickup confirmed');
      updateLocalStage(id, 'pickup_confirmed');
    } catch (err: any) {
      addToast('error', err.message);
      fetchData(); // refresh to get real state on error
    } finally { setActing(null); }
  };

  const handleReject = async () => {
    if (!rejectForm.admin_suggested_date || !rejectForm.admin_suggested_time_from || !rejectForm.admin_suggested_time_to) {
      addToast('error', 'Please fill in a suggested date and time range');
      return;
    }
    if (rejectForm.admin_suggested_time_from >= rejectForm.admin_suggested_time_to) {
      addToast('error', 'Start time must be before end time');
      return;
    }
    setActing(rejectModal.id);
    try {
      await api.respondToPickup(rejectModal.id, {
        action: 'reject',
        ...rejectForm,
      });
      addToast('success', 'Counter-proposal sent to customer');
      updateLocalStage(rejectModal.id, 'pickup_counter', {
        admin_suggested_date: rejectForm.admin_suggested_date,
        admin_suggested_time_from: rejectForm.admin_suggested_time_from,
        admin_suggested_time_to: rejectForm.admin_suggested_time_to,
        admin_pickup_notes: rejectForm.admin_pickup_notes,
      });
      setRejectModal(null);
      setRejectForm({ admin_suggested_date: '', admin_suggested_time_from: '', admin_suggested_time_to: '', admin_pickup_notes: '' });
    } catch (err: any) {
      addToast('error', err.message);
      fetchData();
    } finally { setActing(null); }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Cancel this pickup? The customer will be notified.')) return;
    setActing(id);
    try {
      await api.respondToPickup(id, { action: 'cancel' });
      addToast('success', 'Pickup cancelled');
      removeLocal(id); // pickup_cancelled is not a fetched stage
    } catch (err: any) {
      addToast('error', err.message);
      fetchData();
    } finally { setActing(null); }
  };

  const handleDispatch = async (id: string) => {
    if (!window.confirm('Dispatch driver for this pickup?')) return;
    setActing(id);
    try {
      await api.dispatchDriver(id);
      addToast('success', 'Driver dispatched');
      updateLocalStage(id, 'driver_dispatched');
    } catch (err: any) {
      addToast('error', err.message);
      fetchData();
    } finally { setActing(null); }
  };

  const handleArrived = async (id: string) => {
    if (!window.confirm('Mark this item as arrived at office?')) return;
    setActing(id);
    try {
      await api.markArrived(id);
      addToast('success', 'Marked as arrived');
      removeLocal(id); // arrived_at_office is not a fetched stage
    } catch (err: any) {
      addToast('error', err.message);
      fetchData();
    } finally { setActing(null); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">Pickup Management</h1>
      {submissions.length === 0 ? (
        <EmptyState title="No pickups" description="Customer pickup proposals and confirmed pickups will appear here" />
      ) : (
        <div className="space-y-4">
          {submissions.map((sub: any) => {
            const stage = STAGES[sub.stage] || { label: sub.stage, color: '#666' };
            return (
              <Card key={sub.id} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium">{sub.name}</p>
                    <p className="text-xs text-wimc-subtle">{sub.brand} &middot; Seller: {sub.seller_name || sub.seller_id?.slice(0, 8)}</p>
                  </div>
                  <Badge color={stage.color}>{stage.label}</Badge>
                </div>

                {/* Customer's proposed details */}
                {(sub.stage === 'pickup_proposed' || sub.stage === 'pickup_confirmed' || sub.stage === 'driver_dispatched') && sub.pickup_date && (
                  <div className="bg-wimc-surface-alt rounded-lg p-3 mb-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-wimc-muted">
                      <Calendar className="w-4 h-4 text-wimc-subtle" />
                      <span>{formatDateDisplay(sub.pickup_date)}</span>
                    </div>
                    {sub.pickup_time_from && sub.pickup_time_to && (
                      <div className="flex items-center gap-2 text-wimc-muted">
                        <Clock className="w-4 h-4 text-wimc-subtle" />
                        <span>{sub.pickup_time_from} - {sub.pickup_time_to}</span>
                      </div>
                    )}
                    {sub.pickup_address && (
                      <div className="flex items-start gap-2 text-wimc-muted sm:col-span-2">
                        <MapPin className="w-4 h-4 text-wimc-subtle flex-shrink-0 mt-0.5" />
                        <span>{sub.pickup_address}</span>
                      </div>
                    )}
                    {sub.driver_phone && (
                      <div className="flex items-center gap-2 text-wimc-muted">
                        <Phone className="w-4 h-4 text-wimc-subtle" />
                        <span>Phone: {sub.driver_phone}</span>
                      </div>
                    )}
                    {sub.whatsapp_number && (
                      <div className="flex items-center gap-2 text-wimc-muted">
                        <MessageSquare className="w-4 h-4 text-wimc-subtle" />
                        <span>WhatsApp: {sub.whatsapp_number}</span>
                      </div>
                    )}
                    {sub.google_maps_link && (
                      <a href={sub.google_maps_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-wimc-blue hover:underline sm:col-span-2">
                        <ExternalLink className="w-4 h-4" />
                        Open in Maps
                      </a>
                    )}
                  </div>
                )}

                {/* Waiting for customer badge */}
                {sub.stage === 'pickup_counter' && (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mb-3 text-sm text-orange-300">
                    Waiting for customer response to your suggested time
                    {sub.admin_suggested_date && (
                      <span className="text-wimc-subtle ml-1">
                        ({formatDateDisplay(sub.admin_suggested_date)} {sub.admin_suggested_time_from}-{sub.admin_suggested_time_to})
                      </span>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 flex-wrap">
                  {sub.stage === 'pickup_proposed' && (
                    <>
                      <Button size="sm" onClick={() => handleAccept(sub.id)} loading={acting === sub.id}>Accept</Button>
                      <Button size="sm" variant="outline" onClick={() => setRejectModal(sub)}>Reject (Suggest Time)</Button>
                      <Button size="sm" variant="danger" onClick={() => handleCancel(sub.id)} loading={acting === sub.id}>Cancel Pickup</Button>
                    </>
                  )}
                  {sub.stage === 'pickup_confirmed' && (
                    <Button size="sm" variant="outline" onClick={() => handleDispatch(sub.id)} loading={acting === sub.id}>Dispatch Driver</Button>
                  )}
                  {sub.stage === 'driver_dispatched' && (
                    <Button size="sm" variant="success" onClick={() => handleArrived(sub.id)} loading={acting === sub.id}>Mark Arrived</Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reject / Suggest Time Modal */}
      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Suggest Different Time">
        <div className="space-y-4">
          <p className="text-sm text-wimc-subtle">
            The customer proposed: {rejectModal?.pickup_date && formatDateDisplay(rejectModal.pickup_date)}
            {rejectModal?.pickup_time_from && ` ${rejectModal.pickup_time_from}-${rejectModal.pickup_time_to}`}
          </p>
          <Input
            label="Your Suggested Date"
            type="date"
            value={rejectForm.admin_suggested_date}
            onChange={(e) => setRejectForm({ ...rejectForm, admin_suggested_date: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Time From"
              type="time"
              value={rejectForm.admin_suggested_time_from}
              onChange={(e) => setRejectForm({ ...rejectForm, admin_suggested_time_from: e.target.value })}
            />
            <Input
              label="Time To"
              type="time"
              value={rejectForm.admin_suggested_time_to}
              onChange={(e) => setRejectForm({ ...rejectForm, admin_suggested_time_to: e.target.value })}
            />
          </div>
          <Input
            label="Notes for Customer (optional)"
            value={rejectForm.admin_pickup_notes}
            onChange={(e) => setRejectForm({ ...rejectForm, admin_pickup_notes: e.target.value })}
            placeholder="e.g., We're only available in the morning on that day"
          />
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setRejectModal(null)}>Cancel</Button>
            <Button onClick={handleReject} loading={acting === rejectModal?.id}>Send Suggestion</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
