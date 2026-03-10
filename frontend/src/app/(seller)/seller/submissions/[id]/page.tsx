'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useToast } from '@/providers/toast-provider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatPrice } from '@/lib/currency';
import Image from 'next/image';

const STAGES: Record<string, { label: string; color: string }> = {
  pending_review: { label: 'Pending Review', color: '#FFBB44' },
  price_suggested: { label: 'Price Suggested', color: '#88BBFF' },
  price_accepted: { label: 'Price Accepted', color: '#44DD66' },
  price_rejected: { label: 'Price Rejected', color: '#FF4444' },
  pickup_scheduled: { label: 'Pickup Scheduled', color: '#FF8844' },
  driver_dispatched: { label: 'Driver Dispatched', color: '#AA88FF' },
  arrived_at_office: { label: 'At Office', color: '#88BBFF' },
  auth_passed: { label: 'Authenticated', color: '#44DD66' },
  auth_failed: { label: 'Auth Failed', color: '#FF4444' },
  photoshoot_done: { label: 'Photoshoot Done', color: '#AA88FF' },
  listed: { label: 'Listed', color: '#44DD66' },
  rejected: { label: 'Rejected', color: '#FF4444' },
};

export default function SellerSubmissionDetailPage() {
  const { id } = useParams();
  const { addToast } = useToast();
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const fetchSubmission = () => {
    if (id) api.getSubmission(id as string).then(setSubmission).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { fetchSubmission(); }, [id]);

  const handleAccept = async () => {
    setActing(true);
    try {
      await api.acceptPrice(submission.id);
      addToast('success', 'Price accepted! Pickup will be scheduled.');
      fetchSubmission();
    } catch (err: any) { addToast('error', err.message); }
    finally { setActing(false); }
  };

  const handleReject = async () => {
    setActing(true);
    try {
      await api.rejectPrice(submission.id);
      addToast('info', 'Price rejected.');
      fetchSubmission();
    } catch (err: any) { addToast('error', err.message); }
    finally { setActing(false); }
  };

  if (loading) return <LoadingSpinner />;
  if (!submission) return <div className="text-center py-20 text-wimc-subtle">Submission not found</div>;

  const stage = STAGES[submission.stage] || { label: submission.stage, color: '#666' };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl font-bold">{submission.name}</h1>
          <Badge color={stage.color}>{stage.label}</Badge>
        </div>
        <p className="text-sm text-wimc-subtle mt-1">{submission.brand} &middot; {submission.category} &middot; {submission.condition}</p>
      </div>

      {/* Photos */}
      {submission.user_photos?.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {submission.user_photos.map((photo: string, i: number) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
              <Image src={photo} alt="" fill className="object-cover" sizes="(max-width: 768px) 25vw, 160px" unoptimized />
            </div>
          ))}
        </div>
      )}

      <Card className="p-5 space-y-3">
        <p className="text-sm text-wimc-muted">{submission.description}</p>
        {submission.color && <p className="text-sm text-wimc-subtle">Color: {submission.color}</p>}
      </Card>

      {/* Price Proposal */}
      {submission.stage === 'price_suggested' && submission.proposed_price && (
        <Card className="p-6 border-wimc-blue/30">
          <h3 className="font-heading font-semibold mb-2">Price Proposal</h3>
          <p className="text-2xl font-heading font-bold text-wimc-blue">{formatPrice(submission.proposed_price)}</p>
          {submission.admin_notes && <p className="text-sm text-wimc-subtle mt-2">{submission.admin_notes}</p>}
          <div className="flex gap-3 mt-4">
            <Button onClick={handleAccept} loading={acting}>Accept Price</Button>
            <Button variant="danger" onClick={handleReject} loading={acting}>Reject</Button>
          </div>
        </Card>
      )}

      {submission.rejection_reason && (
        <Card className="p-5 border-wimc-red/30">
          <h3 className="text-sm font-semibold text-wimc-red mb-1">Rejection Reason</h3>
          <p className="text-sm text-wimc-subtle">{submission.rejection_reason}</p>
        </Card>
      )}

      {/* Timeline */}
      {submission.wimc_submission_events?.length > 0 && (
        <Card className="p-6">
          <h3 className="font-heading font-semibold mb-4">Timeline</h3>
          <div className="space-y-3">
            {submission.wimc_submission_events.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((event: any) => (
              <div key={event.id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-wimc-border-alt mt-1.5" />
                <div>
                  <p className="text-sm">{event.message}</p>
                  <p className="text-xs text-wimc-subtle">{new Date(event.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
