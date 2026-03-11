'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function ErrorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    setLoading(true);
    setLoadError(null);
    api.getErrorLog(params.id as string)
      .then(setError)
      .catch((err) => setLoadError(err.message || 'Failed to load error'))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <LoadingSpinner />;
  if (loadError) {
    return (
      <div className="text-center py-12">
        <p className="text-wimc-subtle mb-4">{loadError}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }
  if (!error) return null;

  return (
    <div>
      <button
        onClick={() => router.push('/developer/error-logs')}
        className="flex items-center gap-1 text-sm text-wimc-subtle hover:text-white mb-4 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M15 19l-7-7 7-7" />
        </svg>
        Back to Error Logs
      </button>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="font-heading text-2xl font-bold">Error Detail</h1>
        <Badge color="#ef4444">{error.http_status}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card className="p-5">
          <h2 className="text-xs text-wimc-subtle uppercase tracking-wider mb-2">Error Type</h2>
          <p className="text-sm font-mono">{error.error_type}</p>
        </Card>
        <Card className="p-5">
          <h2 className="text-xs text-wimc-subtle uppercase tracking-wider mb-2">Endpoint</h2>
          <p className="text-sm font-mono">{error.endpoint}</p>
        </Card>
        <Card className="p-5">
          <h2 className="text-xs text-wimc-subtle uppercase tracking-wider mb-2">Timestamp</h2>
          <p className="text-sm">{new Date(error.created_at).toLocaleString()}</p>
        </Card>
        <Card className="p-5">
          <h2 className="text-xs text-wimc-subtle uppercase tracking-wider mb-2">User ID</h2>
          <p className="text-sm font-mono">{error.user_id || 'N/A'}</p>
        </Card>
      </div>

      <Card className="p-5 mb-4">
        <h2 className="text-xs text-wimc-subtle uppercase tracking-wider mb-2">Message</h2>
        <p className="text-sm">{error.message}</p>
      </Card>

      {error.stack_trace && (
        <Card className="p-5 mb-4">
          <h2 className="text-xs text-wimc-subtle uppercase tracking-wider mb-2">Stack Trace</h2>
          <pre className="text-xs font-mono bg-wimc-bg p-4 rounded-lg overflow-auto max-h-96 whitespace-pre-wrap">
            {error.stack_trace}
          </pre>
        </Card>
      )}

      {error.request_body && (
        <Card className="p-5 mb-4">
          <h2 className="text-xs text-wimc-subtle uppercase tracking-wider mb-2">Request Body</h2>
          <pre className="text-xs font-mono bg-wimc-bg p-4 rounded-lg overflow-auto max-h-60">
            {JSON.stringify(error.request_body, null, 2)}
          </pre>
        </Card>
      )}

      {error.metadata && Object.keys(error.metadata).length > 0 && (
        <Card className="p-5">
          <h2 className="text-xs text-wimc-subtle uppercase tracking-wider mb-2">Metadata</h2>
          <pre className="text-xs font-mono bg-wimc-bg p-4 rounded-lg overflow-auto max-h-60">
            {JSON.stringify(error.metadata, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
