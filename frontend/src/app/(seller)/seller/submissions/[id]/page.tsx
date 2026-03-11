'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useToast } from '@/providers/toast-provider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatPrice } from '@/lib/currency';
import { STAGES, PROGRESS_STEPS, getStepIndex } from '@/lib/submission-stages';
import Image from 'next/image';
import { ArrowLeft, MapPin, Phone, Calendar, Clock, ExternalLink, CheckCircle, MessageSquare, AlertTriangle } from 'lucide-react';

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
}

function validatePhone(value: string): string | null {
  if (!value) return 'Phone number is required';
  if (!/^\d+$/.test(value)) return 'Only digits allowed';
  if (value.length !== 11) return 'Must be exactly 11 digits';
  if (!value.startsWith('0')) return 'Must start with 0';
  return null;
}

function validateTimeRange(from: string, to: string): string | null {
  if (!from || !to) return 'Both start and end time are required';
  if (from >= to) return 'Start time must be before end time';
  return null;
}

export default function SellerSubmissionDetailPage() {
  const { id } = useParams();
  const { addToast } = useToast();
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Pickup form state
  const [showPickupForm, setShowPickupForm] = useState(false);
  const [pickupForm, setPickupForm] = useState({
    pickup_date_display: '',
    pickup_time_from: '',
    pickup_time_to: '',
    pickup_address: '',
    driver_phone: '',
    whatsapp_number: '',
    google_maps_link: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchSubmission = (isRefresh = false) => {
    setError(null);
    if (isRefresh) setRefreshing(true);
    if (id) {
      api.getSubmission(id as string)
        .then(setSubmission)
        .catch((err) => setError(err.message || 'Failed to load submission'))
        .finally(() => { setLoading(false); setRefreshing(false); });
    }
  };
  useEffect(() => { fetchSubmission(); }, [id]);

  const handleAccept = async () => {
    setActing(true);
    try {
      const updated = await api.acceptPrice(submission.id);
      addToast('success', 'Price accepted! You can now propose a pickup time.');
      if (updated && updated.stage) {
        setSubmission((prev: any) => ({ ...prev, ...updated }));
      } else {
        fetchSubmission(true);
      }
    } catch (err: any) { addToast('error', err.message); }
    finally { setActing(false); }
  };

  const handleReject = async () => {
    setActing(true);
    try {
      const updated = await api.rejectPrice(submission.id);
      addToast('info', 'Price rejected.');
      if (updated && updated.stage) {
        setSubmission((prev: any) => ({ ...prev, ...updated }));
      } else {
        fetchSubmission(true);
      }
    } catch (err: any) { addToast('error', err.message); }
    finally { setActing(false); }
  };

  const parseDateDisplay = (val: string): { valid: boolean; iso: string; day: number; month: number; year: number } => {
    const match = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return { valid: false, iso: '', day: 0, month: 0, year: 0 };
    const day = parseInt(match[1]);
    const month = parseInt(match[2]);
    const year = parseInt(match[3]);
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() !== year || d.getMonth() + 1 !== month || d.getDate() !== day) {
      return { valid: false, iso: '', day, month, year };
    }
    return { valid: true, iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, day, month, year };
  };

  const validatePickupForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!pickupForm.pickup_date_display) {
      errors.pickup_date = 'Date is required';
    } else {
      const parsed = parseDateDisplay(pickupForm.pickup_date_display);
      if (!parsed.valid) {
        errors.pickup_date = 'Enter a valid date as dd/mm/yyyy';
      } else {
        const selected = new Date(parsed.iso);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selected < today) errors.pickup_date = 'Date cannot be in the past';
      }
    }
    const timeErr = validateTimeRange(pickupForm.pickup_time_from, pickupForm.pickup_time_to);
    if (timeErr) errors.pickup_time = timeErr;
    if (!pickupForm.pickup_address || pickupForm.pickup_address.length < 5) {
      errors.pickup_address = 'Address must be at least 5 characters';
    }
    const phoneErr = validatePhone(pickupForm.driver_phone);
    if (phoneErr) errors.driver_phone = phoneErr;
    const whatsappErr = validatePhone(pickupForm.whatsapp_number);
    if (whatsappErr) errors.whatsapp_number = whatsappErr;
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProposePickup = async () => {
    if (!validatePickupForm()) return;
    setActing(true);
    try {
      const updated = await api.proposePickup(submission.id, {
        pickup_date: parseDateDisplay(pickupForm.pickup_date_display).iso,
        pickup_time_from: pickupForm.pickup_time_from,
        pickup_time_to: pickupForm.pickup_time_to,
        pickup_address: pickupForm.pickup_address,
        driver_phone: pickupForm.driver_phone,
        whatsapp_number: pickupForm.whatsapp_number,
        google_maps_link: pickupForm.google_maps_link || undefined,
      });
      addToast('success', 'Pickup proposal submitted! We\'ll review it shortly.');
      if (updated && updated.stage) {
        setSubmission((prev: any) => ({ ...prev, ...updated }));
      } else {
        fetchSubmission(true);
      }
      setShowPickupForm(false);
    } catch (err: any) { addToast('error', err.message); }
    finally { setActing(false); }
  };

  const handleAcceptAdminTime = async () => {
    setActing(true);
    try {
      const updated = await api.acceptAdminPickupTime(submission.id);
      addToast('success', 'Pickup time confirmed!');
      if (updated && updated.stage) {
        setSubmission((prev: any) => ({ ...prev, ...updated }));
      } else {
        fetchSubmission(true);
      }
    } catch (err: any) { addToast('error', err.message); }
    finally { setActing(false); }
  };

  const handleCounterPickup = async () => {
    if (!validatePickupForm()) return;
    setActing(true);
    try {
      const updated = await api.counterPickup(submission.id, {
        pickup_date: parseDateDisplay(pickupForm.pickup_date_display).iso,
        pickup_time_from: pickupForm.pickup_time_from,
        pickup_time_to: pickupForm.pickup_time_to,
        pickup_address: pickupForm.pickup_address,
        driver_phone: pickupForm.driver_phone,
        whatsapp_number: pickupForm.whatsapp_number,
        google_maps_link: pickupForm.google_maps_link || undefined,
      });
      addToast('success', 'Counter-proposal submitted!');
      if (updated && updated.stage) {
        setSubmission((prev: any) => ({ ...prev, ...updated }));
      } else {
        fetchSubmission(true);
      }
      setShowPickupForm(false);
    } catch (err: any) { addToast('error', err.message); }
    finally { setActing(false); }
  };

  const prefillForm = () => {
    let dateDisplay = '';
    if (submission.pickup_date) {
      dateDisplay = formatDateDisplay(submission.pickup_date);
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const d = String(tomorrow.getDate()).padStart(2, '0');
      const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const y = tomorrow.getFullYear();
      dateDisplay = `${d}/${m}/${y}`;
    }
    setPickupForm({
      pickup_date_display: dateDisplay,
      pickup_time_from: submission.pickup_time_from || '',
      pickup_time_to: submission.pickup_time_to || '',
      pickup_address: submission.pickup_address || '',
      driver_phone: submission.driver_phone || '',
      whatsapp_number: submission.whatsapp_number || '',
      google_maps_link: submission.google_maps_link || '',
    });
    setFormErrors({});
  };

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-wimc-subtle mb-4">{error}</p>
        <Button onClick={() => { setLoading(true); fetchSubmission(); }}>Try Again</Button>
      </div>
    );
  }

  if (!submission) return <div className="text-center py-20 text-wimc-subtle">Submission not found</div>;

  const stage = STAGES[submission.stage] || { label: submission.stage, color: '#666' };
  const currentStepIndex = getStepIndex(submission.stage);
  const isTerminal = ['rejected', 'price_rejected', 'auth_failed', 'pickup_cancelled'].includes(submission.stage);
  const showPickupInfo = ['pickup_confirmed', 'driver_dispatched', 'arrived_at_office', 'auth_passed', 'auth_failed', 'photoshoot_done', 'listed'].includes(submission.stage);

  const pickupFormJsx = (isCounter: boolean) => (
    <>
      <div>
        <Input
          label="Pickup Date"
          value={pickupForm.pickup_date_display}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
            let formatted = '';
            for (let i = 0; i < raw.length; i++) {
              if (i === 2 || i === 4) formatted += '/';
              formatted += raw[i];
            }
            setPickupForm(f => ({ ...f, pickup_date_display: formatted }));
          }}
          placeholder="dd/mm/yyyy"
          maxLength={10}
        />
        <p className="text-xs text-wimc-subtle mt-1">Choose a date that works for you (dd/mm/yyyy)</p>
        {formErrors.pickup_date && <p className="text-xs text-red-400 mt-1">{formErrors.pickup_date}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Input
            label="Time From"
            type="time"
            value={pickupForm.pickup_time_from}
            onChange={(e) => setPickupForm(f => ({ ...f, pickup_time_from: e.target.value }))}
          />
          <p className="text-xs text-wimc-subtle mt-1">Start of your available window</p>
        </div>
        <div>
          <Input
            label="Time To"
            type="time"
            value={pickupForm.pickup_time_to}
            onChange={(e) => setPickupForm(f => ({ ...f, pickup_time_to: e.target.value }))}
          />
          <p className="text-xs text-wimc-subtle mt-1">End of your available window</p>
        </div>
      </div>
      {formErrors.pickup_time && <p className="text-xs text-red-400">{formErrors.pickup_time}</p>}

      <div>
        <Input
          label="Pickup Address"
          value={pickupForm.pickup_address}
          onChange={(e) => setPickupForm(f => ({ ...f, pickup_address: e.target.value }))}
          placeholder="Full address for pickup"
        />
        <p className="text-xs text-wimc-subtle mt-1">Where should we pick up the item?</p>
        {formErrors.pickup_address && <p className="text-xs text-red-400 mt-1">{formErrors.pickup_address}</p>}
      </div>

      <div>
        <Input
          label="Phone Number"
          value={pickupForm.driver_phone}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 11);
            setPickupForm(f => ({ ...f, driver_phone: v }));
          }}
          placeholder="01XXXXXXXXX"
          maxLength={11}
          inputMode="numeric"
        />
        <p className="text-xs text-wimc-subtle mt-1">Your phone number for the driver to contact you</p>
        {formErrors.driver_phone && <p className="text-xs text-red-400 mt-1">{formErrors.driver_phone}</p>}
      </div>

      <div>
        <Input
          label="WhatsApp Number"
          value={pickupForm.whatsapp_number}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 11);
            setPickupForm(f => ({ ...f, whatsapp_number: v }));
          }}
          placeholder="01XXXXXXXXX"
          maxLength={11}
          inputMode="numeric"
        />
        <p className="text-xs text-wimc-subtle mt-1">Your WhatsApp for quick communication</p>
        {formErrors.whatsapp_number && <p className="text-xs text-red-400 mt-1">{formErrors.whatsapp_number}</p>}
      </div>

      <div>
        <Input
          label="Google Maps Link (optional)"
          value={pickupForm.google_maps_link}
          onChange={(e) => setPickupForm(f => ({ ...f, google_maps_link: e.target.value }))}
          placeholder="https://maps.google.com/..."
        />
        <p className="text-xs text-wimc-subtle mt-1">Paste a Google Maps link to your location for easy navigation</p>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          onClick={isCounter ? handleCounterPickup : handleProposePickup}
          loading={acting}
        >
          {isCounter ? 'Suggest Another Time' : 'Propose Pickup Time'}
        </Button>
        <Button variant="ghost" onClick={() => setShowPickupForm(false)}>Cancel</Button>
      </div>
    </>
  );

  return (
    <div className="max-w-2xl space-y-6">
      {/* Back button */}
      <Link href="/seller/submissions" className="inline-flex items-center gap-1.5 text-sm text-wimc-muted hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to submissions
      </Link>

      <div>
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl font-bold">{submission.name}</h1>
          <Badge color={stage.color}>{stage.label}</Badge>
          {refreshing && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
        </div>
        <p className="text-sm text-wimc-subtle mt-1">{submission.brand} &middot; {submission.category} &middot; {submission.condition}</p>
      </div>

      {/* Progress bar */}
      {!isTerminal && (
        <Card className="p-5">
          <div className="flex items-center justify-between">
            {PROGRESS_STEPS.map((step, i) => {
              const isCompleted = currentStepIndex > i;
              const isCurrent = currentStepIndex === i;
              return (
                <div key={step.key} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                      isCompleted ? 'bg-green-500 text-white' : isCurrent ? 'bg-wimc-red text-white ring-2 ring-wimc-red/30' : 'bg-wimc-surface-alt text-wimc-subtle'
                    }`}>
                      {isCompleted ? <CheckCircle className="w-4 h-4" /> : i + 1}
                    </div>
                    <span className={`text-[10px] mt-1.5 text-center leading-tight ${isCurrent ? 'text-white font-medium' : 'text-wimc-subtle'}`}>
                      {step.label}
                    </span>
                  </div>
                  {i < PROGRESS_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1.5 mt-[-14px] ${isCompleted ? 'bg-green-500' : 'bg-wimc-border'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Photos */}
      {submission.user_photos?.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {submission.user_photos.map((photo: string, i: number) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
              <Image src={photo} alt="" fill className="object-cover" sizes="(max-width: 640px) 50vw, 160px" unoptimized />
            </div>
          ))}
        </div>
      )}

      <Card className="p-5 space-y-3">
        <p className="text-sm text-wimc-muted">{submission.description}</p>
        {submission.color && <p className="text-sm text-wimc-subtle">Color: {submission.color}</p>}
      </Card>

      {/* === PICKUP NEGOTIATION STAGES === */}

      {/* Stage: price_accepted — Show "Propose Pickup" form */}
      {submission.stage === 'price_accepted' && (
        <Card className="p-6 border-green-500/30">
          <h3 className="font-heading font-semibold mb-2">Schedule Your Pickup</h3>
          <p className="text-sm text-wimc-subtle mb-4">
            Great! Your price has been accepted. Please propose a convenient pickup date and time.
          </p>
          {!showPickupForm ? (
            <Button onClick={() => { prefillForm(); setShowPickupForm(true); }}>Propose Pickup Time</Button>
          ) : (
            <div className="space-y-4">{pickupFormJsx(false)}</div>
          )}
        </Card>
      )}

      {/* Stage: pickup_proposed — Waiting for admin */}
      {submission.stage === 'pickup_proposed' && (
        <Card className="p-6 border-yellow-500/30">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-heading font-semibold mb-1">Pickup Proposal Under Review</h3>
              <p className="text-sm text-wimc-subtle">
                Your pickup proposal is being reviewed. We&apos;ll notify you when it&apos;s confirmed.
              </p>
              {submission.pickup_date && (
                <div className="mt-3 text-sm text-wimc-muted space-y-1">
                  <p>Date: {formatDateDisplay(submission.pickup_date)}</p>
                  {submission.pickup_time_from && submission.pickup_time_to && (
                    <p>Time: {submission.pickup_time_from} - {submission.pickup_time_to}</p>
                  )}
                  {submission.pickup_address && <p>Address: {submission.pickup_address}</p>}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Stage: pickup_counter — Admin suggested different time */}
      {submission.stage === 'pickup_counter' && (
        <Card className="p-6 border-orange-500/30">
          <div className="flex items-start gap-3 mb-4">
            <MessageSquare className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-heading font-semibold mb-1">WIMC Suggested a Different Time</h3>
              <p className="text-sm text-wimc-subtle">
                We couldn&apos;t accommodate your proposed time. Here&apos;s our suggestion:
              </p>
            </div>
          </div>

          <div className="bg-wimc-surface-alt rounded-lg p-4 mb-4 space-y-2">
            {submission.admin_suggested_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-wimc-subtle" />
                <span className="text-wimc-muted">{formatDateDisplay(submission.admin_suggested_date)}</span>
              </div>
            )}
            {submission.admin_suggested_time_from && submission.admin_suggested_time_to && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-wimc-subtle" />
                <span className="text-wimc-muted">{submission.admin_suggested_time_from} - {submission.admin_suggested_time_to}</span>
              </div>
            )}
            {submission.admin_pickup_notes && (
              <p className="text-sm text-wimc-subtle mt-2 pt-2 border-t border-wimc-border">
                {submission.admin_pickup_notes}
              </p>
            )}
          </div>

          {!showPickupForm ? (
            <div className="flex gap-3">
              <Button onClick={handleAcceptAdminTime} loading={acting}>Accept This Time</Button>
              <Button variant="outline" onClick={() => { prefillForm(); setShowPickupForm(true); }}>Suggest Another Time</Button>
            </div>
          ) : (
            <div className="space-y-4">{pickupFormJsx(true)}</div>
          )}
        </Card>
      )}

      {/* Stage: pickup_confirmed — Confirmed details */}
      {submission.stage === 'pickup_confirmed' && (
        <Card className="p-6 border-green-500/30">
          <div className="flex items-start gap-3 mb-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-heading font-semibold mb-1">Pickup Confirmed</h3>
              <p className="text-sm text-wimc-subtle">Your pickup has been confirmed. Our driver will arrive at the scheduled time.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mt-3">
            {submission.pickup_date && (
              <div className="flex items-center gap-2 text-wimc-muted">
                <Calendar className="w-4 h-4 text-wimc-subtle flex-shrink-0" />
                <span>{formatDateDisplay(submission.pickup_date)}</span>
              </div>
            )}
            {submission.pickup_time_from && submission.pickup_time_to && (
              <div className="flex items-center gap-2 text-wimc-muted">
                <Clock className="w-4 h-4 text-wimc-subtle flex-shrink-0" />
                <span>{submission.pickup_time_from} - {submission.pickup_time_to}</span>
              </div>
            )}
            {submission.pickup_address && (
              <div className="flex items-start gap-2 text-wimc-muted sm:col-span-2">
                <MapPin className="w-4 h-4 text-wimc-subtle flex-shrink-0 mt-0.5" />
                <span>{submission.pickup_address}</span>
              </div>
            )}
            {submission.driver_phone && (
              <div className="flex items-center gap-2 text-wimc-muted">
                <Phone className="w-4 h-4 text-wimc-subtle flex-shrink-0" />
                <span>{submission.driver_phone}</span>
              </div>
            )}
            {submission.google_maps_link && (
              <a href={submission.google_maps_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-wimc-blue hover:underline">
                <ExternalLink className="w-4 h-4 flex-shrink-0" />
                Open in Maps
              </a>
            )}
          </div>
        </Card>
      )}

      {/* Stage: pickup_cancelled */}
      {submission.stage === 'pickup_cancelled' && (
        <Card className="p-6 border-red-500/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-heading font-semibold mb-1 text-red-400">Pickup Cancelled</h3>
              <p className="text-sm text-wimc-subtle">
                The pickup has been cancelled by WIMC. Please contact support if you have questions.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Pickup Details for later stages */}
      {showPickupInfo && submission.pickup_date && (
        <Card className="p-5 border-wimc-yellow/20">
          <h3 className="font-heading font-semibold mb-3">Pickup Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-wimc-muted">
              <Calendar className="w-4 h-4 text-wimc-subtle flex-shrink-0" />
              <span>{formatDateDisplay(submission.pickup_date)}</span>
            </div>
            {submission.pickup_time_from && submission.pickup_time_to && (
              <div className="flex items-center gap-2 text-wimc-muted">
                <Clock className="w-4 h-4 text-wimc-subtle flex-shrink-0" />
                <span>{submission.pickup_time_from} - {submission.pickup_time_to}</span>
              </div>
            )}
            {submission.pickup_address && (
              <div className="flex items-start gap-2 text-wimc-muted sm:col-span-2">
                <MapPin className="w-4 h-4 text-wimc-subtle flex-shrink-0 mt-0.5" />
                <span>{submission.pickup_address}</span>
              </div>
            )}
            {submission.driver_phone && (
              <div className="flex items-center gap-2 text-wimc-muted">
                <Phone className="w-4 h-4 text-wimc-subtle flex-shrink-0" />
                <span>{submission.driver_phone}</span>
              </div>
            )}
            {submission.google_maps_link && (
              <a href={submission.google_maps_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-wimc-blue hover:underline">
                <ExternalLink className="w-4 h-4 flex-shrink-0" />
                Open in Maps
              </a>
            )}
          </div>
        </Card>
      )}

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
            {[...submission.wimc_submission_events].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((event: any) => (
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
