'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';

const ACTION_COLORS: Record<string, string> = {
  admin_review: '#3b82f6',
  role_change: '#f59e0b',
  account_disabled: '#ef4444',
  account_enabled: '#22c55e',
  force_logout: '#a855f7',
  schedule_pickup: '#06b6d4',
  qc_report: '#8b5cf6',
  create: '#22c55e',
  status_update: '#f97316',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    setError(null);
    const params: Record<string, string> = { page: String(page) };
    if (entityType) params.entity_type = entityType;
    if (action) params.action = action;
    if (dateFrom) params.from = dateFrom;
    if (dateTo) params.to = dateTo;

    api.getAuditLogs(params)
      .then((res) => {
        setLogs(res.logs);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch((err) => setError(err.message || 'Failed to load audit logs'))
      .finally(() => setLoading(false));
  }, [page, entityType, action, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">Audit Logs</h1>

      <Card className="p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <select
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
            className="bg-wimc-bg border border-wimc-border rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">All Entities</option>
            <option value="submission">Submission</option>
            <option value="listing">Listing</option>
            <option value="order">Order</option>
            <option value="payout">Payout</option>
            <option value="user">User</option>
          </select>
          <Input
            placeholder="Action filter..."
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className="w-40"
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
          <Button onClick={fetchLogs}>Try Again</Button>
        </div>
      ) : logs.length === 0 ? (
        <EmptyState title="No audit logs" description="No logs match the current filters" />
      ) : (
        <>
          <p className="text-xs text-wimc-subtle mb-3">{total} entr{total !== 1 ? 'ies' : 'y'}</p>
          <div className="space-y-2">
            {logs.map((log) => (
              <Card key={log.id} className="p-4">
                <div
                  className="flex items-center gap-4 cursor-pointer"
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge color={ACTION_COLORS[log.action] || '#666'}>{log.action}</Badge>
                      <Badge>{log.entity_type}</Badge>
                    </div>
                    <p className="text-xs text-wimc-subtle">
                      by {log.actor_name || log.actor_id || 'System'}
                      {log.entity_id && <span> on {log.entity_id.slice(0, 8)}...</span>}
                    </p>
                  </div>
                  <p className="text-xs text-wimc-subtle flex-shrink-0">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                  <svg
                    className={`w-4 h-4 text-wimc-subtle transition-transform ${expanded === log.id ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                  >
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {expanded === log.id && (
                  <div className="mt-3 pt-3 border-t border-wimc-border grid grid-cols-1 md:grid-cols-2 gap-3">
                    {log.old_values && (
                      <div>
                        <p className="text-xs text-wimc-subtle mb-1 uppercase tracking-wider">Old Values</p>
                        <pre className="text-xs bg-wimc-bg p-2 rounded overflow-auto max-h-40">
                          {JSON.stringify(log.old_values, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.new_values && (
                      <div>
                        <p className="text-xs text-wimc-subtle mb-1 uppercase tracking-wider">New Values</p>
                        <pre className="text-xs bg-wimc-bg p-2 rounded overflow-auto max-h-40">
                          {JSON.stringify(log.new_values, null, 2)}
                        </pre>
                      </div>
                    )}
                    {!log.old_values && !log.new_values && (
                      <p className="text-xs text-wimc-subtle">No value changes recorded</p>
                    )}
                  </div>
                )}
              </Card>
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
