'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/currency';
import { STAGES } from '@/lib/submission-stages';
import Image from 'next/image';

export default function SellerSubmissionsPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = () => {
    setError(null);
    setLoading(true);
    api.getSubmissions()
      .then(setSubmissions)
      .catch((err) => setError(err.message || 'Something went wrong'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-wimc-subtle mb-4">{error}</p>
        <Button onClick={fetchData}>Try Again</Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">My Submissions</h1>
      {submissions.length === 0 ? (
        <EmptyState title="No submissions yet" description="Submit your first luxury item for review" />
      ) : (
        <div className="space-y-3">
          {submissions.map((sub: any) => {
            const stage = STAGES[sub.stage] || { label: sub.stage, color: '#666' };
            return (
              <Link key={sub.id} href={`/seller/submissions/${sub.id}`}>
                <Card hover className="p-5 flex items-center gap-4">
                  {sub.user_photos?.[0] && <Image src={sub.user_photos[0]} alt="" width={56} height={56} className="w-14 h-14 rounded-lg object-cover" unoptimized />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{sub.name}</p>
                    <p className="text-xs text-wimc-subtle">{sub.brand} &middot; {sub.category}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {sub.proposed_price && <p className="text-sm font-medium">{formatPrice(sub.proposed_price)}</p>}
                    <Badge color={stage.color}>{stage.label}</Badge>
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
