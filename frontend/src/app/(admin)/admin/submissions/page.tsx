'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
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

const TABS = ['all', 'pending_review', 'price_suggested', 'price_accepted', 'pickup_scheduled', 'arrived_at_office', 'auth_passed', 'photoshoot_done'];

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const stage = activeTab === 'all' ? undefined : activeTab;
    setLoading(true);
    api.getAdminSubmissions(stage).then(setSubmissions).catch(() => setSubmissions([])).finally(() => setLoading(false));
  }, [activeTab]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">Submission Queue</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === tab ? 'bg-wimc-red text-white' : 'bg-wimc-surface text-wimc-muted hover:bg-wimc-surface-alt'
            }`}
          >
            {tab === 'all' ? 'All' : (STAGES[tab]?.label || tab)}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : submissions.length === 0 ? (
        <EmptyState title="No submissions" description="No submissions match this filter" />
      ) : (
        <div className="space-y-3">
          {submissions.map((sub: any) => {
            const stage = STAGES[sub.stage] || { label: sub.stage, color: '#666' };
            return (
              <Link key={sub.id} href={`/admin/submissions/${sub.id}`}>
                <Card hover className="p-5 flex items-center gap-4">
                  {sub.user_photos?.[0] && <Image src={sub.user_photos[0]} alt="" width={56} height={56} className="w-14 h-14 rounded-lg object-cover" unoptimized />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{sub.name}</p>
                    <p className="text-xs text-wimc-subtle">{sub.brand} &middot; {sub.category} &middot; {sub.condition}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Badge color={stage.color}>{stage.label}</Badge>
                    <p className="text-xs text-wimc-subtle mt-1">{new Date(sub.created_at).toLocaleDateString()}</p>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
