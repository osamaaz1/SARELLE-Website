'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useToast } from '@/providers/toast-provider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { STAGES } from '@/lib/submission-stages';
import { CURRENCY_SYMBOL } from '@/lib/currency';
import Image from 'next/image';
import { ArrowLeft, ZoomIn, ZoomOut, X, ChevronLeft, ChevronRight } from 'lucide-react';

function ImageZoomViewer({ photos, initialIndex, onClose }: { photos: string[]; initialIndex: number; onClose: () => void }) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 5;
  const ZOOM_STEP = 0.5;

  const resetView = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  const handleZoomIn = () => setZoom(z => Math.min(z + ZOOM_STEP, MAX_ZOOM));
  const handleZoomOut = () => {
    setZoom(z => {
      const next = Math.max(z - ZOOM_STEP, MIN_ZOOM);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.25 : 0.25;
    setZoom(z => {
      const next = Math.min(Math.max(z + delta, MIN_ZOOM), MAX_ZOOM);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...pan };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setPan({
      x: panStart.current.x + (e.clientX - dragStart.current.x),
      y: panStart.current.y + (e.clientY - dragStart.current.y),
    });
  };
  const handlePointerUp = () => setDragging(false);

  const prev = () => { setIndex(i => (i - 1 + photos.length) % photos.length); resetView(); };
  const next = () => { setIndex(i => (i + 1) % photos.length); resetView(); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/50">
        <span className="text-sm text-white/70">{index + 1} / {photos.length}</span>
        <div className="flex items-center gap-1">
          <button onClick={handleZoomOut} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Zoom out (-)">
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-xs text-white/70 w-14 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={handleZoomIn} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Zoom in (+)">
            <ZoomIn className="w-5 h-5" />
          </button>
          {zoom !== 1 && (
            <button onClick={resetView} className="ml-2 px-2 py-1 text-xs text-white/70 hover:text-white bg-white/10 rounded transition-colors">Reset</button>
          )}
          <button onClick={onClose} className="ml-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Close (Esc)">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Image area */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden select-none"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'default', touchAction: 'none' }}
      >
        <img
          src={photos[index]}
          alt=""
          draggable={false}
          className="max-w-full max-h-full object-contain transition-transform duration-150"
          style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)` }}
        />
      </div>

      {/* Nav arrows */}
      {photos.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors">
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div className="flex items-center justify-center gap-2 py-3 bg-black/50">
          {photos.map((p, i) => (
            <button key={i} onClick={() => { setIndex(i); resetView(); }}
              className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-colors ${i === index ? 'border-white' : 'border-transparent opacity-50 hover:opacity-80'}`}
            >
              <img src={p} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminSubmissionDetailPage() {
  const { id } = useParams();
  const { addToast } = useToast();
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [acting, setActing] = useState(false);
  const [zoomPhoto, setZoomPhoto] = useState<number | null>(null);

  const fetchData = () => {
    setError(null);
    if (id) {
      api.getAdminSubmission(id as string)
        .then(setSub)
        .catch((err) => setError(err.message || 'Failed to load submission'))
        .finally(() => setLoading(false));
    }
  };
  useEffect(() => { fetchData(); }, [id]);

  const refreshSub = async () => {
    try {
      const updated = await api.getAdminSubmission(id as string);
      setSub(updated);
    } catch {}
  };

  const handleApprove = async () => {
    if (!price) { addToast('error', 'Enter a proposed price'); return; }
    setActing(true);
    try {
      const updated = await api.reviewSubmission(sub.id, { action: 'approve', proposed_price: parseFloat(price), admin_notes: notes });
      addToast('success', 'Price proposed to seller');
      if (updated?.stage) {
        setSub((prev: any) => ({ ...prev, ...updated }));
      } else {
        await refreshSub();
      }
    } catch (err: any) { addToast('error', err.message); }
    finally { setActing(false); }
  };

  const handleReject = async () => {
    if (!rejectReason) { addToast('error', 'Enter a rejection reason'); return; }
    if (!window.confirm('Reject this submission? This cannot be undone.')) return;
    setActing(true);
    try {
      const updated = await api.reviewSubmission(sub.id, { action: 'reject', rejection_reason: rejectReason, admin_notes: notes });
      addToast('success', 'Submission rejected');
      if (updated?.stage) {
        setSub((prev: any) => ({ ...prev, ...updated }));
      } else {
        await refreshSub();
      }
    } catch (err: any) { addToast('error', err.message); }
    finally { setActing(false); }
  };

  const handlePhotoshootDone = async () => {
    if (!window.confirm('Mark photoshoot as complete?')) return;
    setActing(true);
    try {
      const updated = await api.markPhotoshootDone(sub.id);
      addToast('success', 'Photoshoot marked as done');
      if (updated?.stage) {
        setSub((prev: any) => ({ ...prev, ...updated }));
      } else {
        await refreshSub();
      }
    } catch (err: any) { addToast('error', err.message); }
    finally { setActing(false); }
  };

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-wimc-subtle mb-4">{error}</p>
        <Button onClick={() => { setLoading(true); fetchData(); }}>Try Again</Button>
      </div>
    );
  }

  if (!sub) return <div className="text-center py-20 text-wimc-subtle">Not found</div>;

  const stage = STAGES[sub.stage] || { label: sub.stage, color: '#666' };

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/admin/submissions" className="inline-flex items-center gap-1.5 text-sm text-wimc-muted hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to submissions
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="font-heading text-2xl font-bold">{sub.name}</h1>
        <Badge color={stage.color}>{stage.label}</Badge>
      </div>
      <p className="text-sm text-wimc-subtle">{sub.brand} &middot; {sub.category} &middot; {sub.condition}</p>

      {sub.user_photos?.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {sub.user_photos.map((p: string, i: number) => (
            <button key={i} onClick={() => setZoomPhoto(i)} className="relative aspect-square rounded-lg overflow-hidden group cursor-zoom-in">
              <Image src={p} alt="" fill className="object-cover" sizes="(max-width: 640px) 50vw, 160px" unoptimized />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
      )}
      {zoomPhoto !== null && sub.user_photos?.length > 0 && (
        <ImageZoomViewer photos={sub.user_photos} initialIndex={zoomPhoto} onClose={() => setZoomPhoto(null)} />
      )}

      <Card className="p-5">
        <p className="text-sm text-wimc-muted">{sub.description}</p>
        {sub.color && <p className="text-sm text-wimc-subtle mt-2">Color: {sub.color}</p>}
      </Card>

      {/* Admin Actions — pending_review */}
      {sub.stage === 'pending_review' && (
        <Card className="p-6 space-y-4 border-wimc-yellow/30">
          <h3 className="font-heading font-semibold">Review Submission</h3>
          <Input label={`Proposed Price (${CURRENCY_SYMBOL})`} type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Enter price" />
          <Input label="Admin Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes for seller" />
          <div className="flex gap-3">
            <Button onClick={handleApprove} loading={acting}>Approve & Propose Price</Button>
            <Button variant="danger" onClick={() => setShowRejectForm(!showRejectForm)}>
              {showRejectForm ? 'Cancel Rejection' : 'Reject'}
            </Button>
          </div>
          {showRejectForm && (
            <div className="space-y-3 pt-3 border-t border-wimc-border">
              <Input label="Rejection Reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Why is this being rejected?" />
              <Button variant="danger" onClick={handleReject} loading={acting}>Confirm Rejection</Button>
            </div>
          )}
        </Card>
      )}

      {/* Quick actions for other stages */}
      {sub.stage === 'price_accepted' && (
        <Card className="p-5 border-wimc-yellow/20">
          <h3 className="font-heading font-semibold mb-3">Waiting for Customer</h3>
          <p className="text-sm text-wimc-subtle mb-3">The seller has accepted the price. Waiting for them to propose a pickup time.</p>
        </Card>
      )}

      {sub.stage === 'pickup_proposed' && (
        <Card className="p-5 border-yellow-500/20">
          <h3 className="font-heading font-semibold mb-3">Pickup Proposal Received</h3>
          <p className="text-sm text-wimc-subtle mb-3">The customer has proposed a pickup time. Review and respond on the pickups page.</p>
          <Link href="/admin/pickups">
            <Button size="sm">Go to Pickup Management</Button>
          </Link>
        </Card>
      )}

      {sub.stage === 'pickup_counter' && (
        <Card className="p-5 border-orange-500/20">
          <h3 className="font-heading font-semibold mb-3">Waiting for Customer Response</h3>
          <p className="text-sm text-wimc-subtle">You suggested a different pickup time. Waiting for the customer to accept or counter-propose.</p>
        </Card>
      )}

      {sub.stage === 'pickup_confirmed' && (
        <Card className="p-5 border-green-500/20">
          <h3 className="font-heading font-semibold mb-3">Pickup Confirmed</h3>
          <p className="text-sm text-wimc-subtle mb-3">Pickup time has been agreed. Dispatch a driver when ready.</p>
          <Link href="/admin/pickups">
            <Button size="sm">Go to Pickup Management</Button>
          </Link>
        </Card>
      )}

      {sub.stage === 'pickup_cancelled' && (
        <Card className="p-5 border-red-500/20">
          <h3 className="font-heading font-semibold mb-3 text-red-400">Pickup Cancelled</h3>
          <p className="text-sm text-wimc-subtle">This pickup has been cancelled.</p>
        </Card>
      )}

      {sub.stage === 'arrived_at_office' && (
        <Card className="p-5 border-wimc-blue/20">
          <h3 className="font-heading font-semibold mb-3">Next Step: QC / Authentication</h3>
          <p className="text-sm text-wimc-subtle mb-3">The item has arrived. Proceed with quality check and authentication.</p>
          <Link href="/admin/qc">
            <Button size="sm">Go to QC</Button>
          </Link>
        </Card>
      )}

      {sub.stage === 'auth_passed' && (
        <Card className="p-5 border-green-500/20">
          <h3 className="font-heading font-semibold mb-3">Next Step: Professional Photoshoot</h3>
          <p className="text-sm text-wimc-subtle mb-3">Authentication passed. Upload professional photos on the Listings page — these are the photos that will appear on the marketplace (customer photos will not be shown).</p>
          <Link href="/admin/listings">
            <Button size="sm">Go to Upload Pro Photos</Button>
          </Link>
        </Card>
      )}

      {sub.stage === 'photoshoot_done' && (
        <Card className="p-5 border-purple-500/20">
          <h3 className="font-heading font-semibold mb-3">Next Step: Publish Listing</h3>
          <p className="text-sm text-wimc-subtle mb-3">Photoshoot complete. Publish this item to the marketplace.</p>
          <Link href="/admin/listings">
            <Button size="sm">Go to Listing Management</Button>
          </Link>
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
