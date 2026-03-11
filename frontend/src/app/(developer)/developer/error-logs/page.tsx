'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';

export default function ErrorLogsPage() {
  const [errors, setErrors] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchErrors = useCallback(() => {
    setLoading(true);
    setError(null);
    const params: Record<string, string> = { page: String(page) };
    if (errorType) params.error_type = errorType;
    if (endpoint) params.endpoint = endpoint;
    if (dateFrom) params.from = dateFrom;
    if (dateTo) params.to = dateTo;

    api.getErrorLogs(params)
      .then((res) => {
        setErrors(res.errors);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch((err) => setError(err.message || 'Failed to load error logs'))
      .finally(() => setLoading(false));
  }, [page, errorType, endpoint, dateFrom, dateTo]);

  useEffect(() => { fetchErrors(); }, [fetchErrors]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">Error Logs</h1>

      <Card className="p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Error type..."
            value={errorType}
            onChange={(e) => { setErrorType(e.target.value); setPage(1); }}
            className="w-48"
          />
          <Input
            placeholder="Endpoint..."
            value={endpoint}
            onChange={(e) => { setEndpoint(e.target.value); setPage(1); }}
            className="w-48"
          />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="w-40"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="w-40"
          />
        </div>
      </Card>

      {loading ? <LoadingSpinner /> : error ? (
        <div className="text-center py-12">
          <p className="text-wimc-subtle mb-4">{error}</p>
          <Button onClick={fetchErrors}>Try Again</Button>
        </div>
      ) : errors.length === 0 ? (
        <EmptyState title="No errors" description="No error logs match the current filters" />
      ) : (
        <>
          <p className="text-xs text-wimc-subtle mb-3">{total} error{total !== 1 ? 's' : ''}</p>
          <div className="space-y-2">
            {errors.map((err) => (
              <Link key={err.id} href={`/developer/error-logs/${err.id}`}>
                <Card hover className="p-4 flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <Badge color="#ef4444">{err.http_status}</Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{err.message}</p>
                    <p className="text-xs text-wimc-subtle">
                      <span className="font-mono">{err.error_type}</span> &middot; {err.endpoint}
                    </p>
                  </div>
                  <p className="text-xs text-wimc-subtle flex-shrink-0">
                    {new Date(err.created_at).toLocaleString()}
                  </p>
                </Card>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Prev</Button>
              <span className="text-sm text-wimc-subtle self-center">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
