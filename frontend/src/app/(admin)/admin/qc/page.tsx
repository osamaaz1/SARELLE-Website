'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/providers/toast-provider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import Image from 'next/image';

export default function AdminQCPage() {
  const { addToast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failNotes, setFailNotes] = useState<Record<string, string>>({});
  const [failErrors, setFailErrors] = useState<Record<string, string>>({});

  const fetchData = () => {
    setLoading(true);
    api.getAdminSubmissions('arrived_at_office').then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, []);

  const handleQC = async (subId: string, passed: boolean) => {
    if (!passed && !failNotes[subId]?.trim()) {
      setFailErrors({ ...failErrors, [subId]: 'Please provide a reason for failing this item' });
      return;
    }
    if (!passed && !window.confirm('Fail authentication for this item? The seller will be notified.')) return;
    if (passed && !window.confirm('Pass authentication for this item?')) return;
    setFailErrors({ ...failErrors, [subId]: '' });
    try {
      await api.submitQCReport({ submission_id: subId, passed, notes: failNotes[subId] });
      addToast('success', passed ? 'Authentication passed' : 'Authentication failed');
      // Optimistic: remove from list (item moves to auth_passed/auth_failed, not fetched here)
      setItems(prev => prev.filter(s => s.id !== subId));
    } catch (err: any) {
      addToast('error', err.message);
      fetchData(); // refresh on error to get real state
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">QC / Authentication</h1>
      {items.length === 0 ? (
        <EmptyState title="No items awaiting QC" description="Items that arrive at the office will appear here" />
      ) : (
        <div className="space-y-4">
          {items.map((sub: any) => (
            <Card key={sub.id} className="p-5 space-y-4">
              <div className="flex items-center gap-4">
                {sub.user_photos?.[0] && <Image src={sub.user_photos[0]} alt="" width={64} height={64} className="w-16 h-16 rounded-lg object-cover" unoptimized />}
                <div className="flex-1">
                  <p className="font-medium">{sub.name}</p>
                  <p className="text-sm text-wimc-subtle">{sub.brand} &middot; {sub.category} &middot; {sub.condition}</p>
                </div>
                <Badge color="#88BBFF">At Office</Badge>
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Input label="Fail Notes (required if rejecting)" value={failNotes[sub.id] || ''} onChange={(e) => { setFailNotes({ ...failNotes, [sub.id]: e.target.value }); setFailErrors({ ...failErrors, [sub.id]: '' }); }} placeholder="Reason for failure..." />
                  {failErrors[sub.id] && <p className="text-xs text-red-400 mt-1">{failErrors[sub.id]}</p>}
                </div>
                <Button variant="success" onClick={() => handleQC(sub.id, true)}>Pass</Button>
                <Button variant="danger" onClick={() => handleQC(sub.id, false)}>Fail</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
