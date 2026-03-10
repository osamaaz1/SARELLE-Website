'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useToast } from '@/providers/toast-provider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import Image from 'next/image';

export default function AdminSubmissionDetailPage() {
  const { id } = useParams();
  const { addToast } = useToast();
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [acting, setActing] = useState(false);

  const fetch = () => {
    if (id) api.getAdminSubmission(id as string).then(setSub).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { fetch(); }, [id]);

  const handleApprove = async () => {
    if (!price) { addToast('error', 'Enter a proposed price'); return; }
    setActing(true);
    try {
      await api.reviewSubmission(sub.id, { action: 'approve', proposed_price: parseFloat(price), admin_notes: notes });
      addToast('success', 'Price proposed to seller');
      fetch();
    } catch (err: any) { addToast('error', err.message); }
    finally { setActing(false); }
  };

  const handleReject = async () => {
    if (!rejectReason) { addToast('error', 'Enter a rejection reason'); return; }
    setActing(true);
    try {
      await api.reviewSubmission(sub.id, { action: 'reject', rejection_reason: rejectReason, admin_notes: notes });
      addToast('success', 'Submission rejected');
      fetch();
    } catch (err: any) { addToast('error', err.message); }
    finally { setActing(false); }
  };

  if (loading) return <LoadingSpinner />;
  if (!sub) return <div className="text-center py-20 text-wimc-subtle">Not found</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="font-heading text-2xl font-bold">{sub.name}</h1>
        <Badge color="#FFBB44">{sub.stage.replace(/_/g, ' ')}</Badge>
      </div>
      <p className="text-sm text-wimc-subtle">{sub.brand} &middot; {sub.category} &middot; {sub.condition}</p>

      {sub.user_photos?.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {sub.user_photos.map((p: string, i: number) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
              <Image src={p} alt="" fill className="object-cover" sizes="(max-width: 768px) 25vw, 160px" unoptimized />
            </div>
          ))}
        </div>
      )}

      <Card className="p-5">
        <p className="text-sm text-wimc-muted">{sub.description}</p>
        {sub.color && <p className="text-sm text-wimc-subtle mt-2">Color: {sub.color}</p>}
      </Card>

      {/* Admin Actions */}
      {sub.stage === 'pending_review' && (
        <Card className="p-6 space-y-4 border-wimc-yellow/30">
          <h3 className="font-heading font-semibold">Review Submission</h3>
          <Input label="Proposed Price ($)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Enter price" />
          <Input label="Admin Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes for seller" />
          <div className="flex gap-3">
            <Button onClick={handleApprove} loading={acting}>Approve & Propose Price</Button>
            <Button variant="danger" onClick={() => document.getElementById('reject-section')?.classList.toggle('hidden')}>Reject</Button>
          </div>
          <div id="reject-section" className="hidden space-y-3 pt-3 border-t border-wimc-border">
            <Input label="Rejection Reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Why is this being rejected?" />
            <Button variant="danger" onClick={handleReject} loading={acting}>Confirm Rejection</Button>
          </div>
        </Card>
      )}

      {/* Timeline */}
      {sub.wimc_submission_events?.length > 0 && (
        <Card className="p-6">
          <h3 className="font-heading font-semibold mb-4">Event Timeline</h3>
          <div className="space-y-3">
            {[...sub.wimc_submission_events].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((ev: any) => (
              <div key={ev.id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-wimc-border-alt mt-1.5" />
                <div>
                  <p className="text-sm">{ev.message}</p>
                  <p className="text-xs text-wimc-subtle">{new Date(ev.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
