'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { StatCard } from '@/components/ui/stat-card';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function DeveloperDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [recentErrors, setRecentErrors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.getDeveloperDashboard(),
      api.getErrorLogs({ limit: '5' }),
    ])
      .then(([dashData, errData]) => {
        setStats(dashData);
        setRecentErrors(errData.errors || []);
      })
      .catch((err) => setError(err.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-wimc-subtle mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">Developer Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Users" value={stats.total_users} />
        <StatCard label="Error Logs" value={stats.total_errors} color="#ef4444" />
        <StatCard label="Audit Entries" value={stats.total_audit_entries} />
        <StatCard label="Uptime" value={formatUptime(stats.uptime)} color="#22c55e" />
      </div>

      {stats.users_by_role && (
        <Card className="p-5 mb-8">
          <h2 className="font-heading text-sm font-semibold mb-3 text-wimc-subtle uppercase tracking-wider">Users by Role</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.users_by_role).map(([role, count]) => (
              <div key={role} className="flex items-center gap-2 bg-wimc-bg px-3 py-2 rounded-lg">
                <Badge>{role}</Badge>
                <span className="text-sm font-medium">{count as number}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-sm font-semibold text-wimc-subtle uppercase tracking-wider">Recent Errors</h2>
          <Link href="/developer/error-logs" className="text-xs text-wimc-red hover:underline">View All</Link>
        </div>
        {recentErrors.length === 0 ? (
          <p className="text-sm text-wimc-subtle">No errors recorded</p>
        ) : (
          <div className="space-y-2">
            {recentErrors.map((err) => (
              <Link key={err.id} href={`/developer/error-logs/${err.id}`}>
                <div className="flex items-center justify-between p-3 rounded-lg bg-wimc-bg hover:bg-wimc-surface-alt transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{err.message}</p>
                    <p className="text-xs text-wimc-subtle">{err.endpoint}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <Badge color="#ef4444">{err.http_status}</Badge>
                    <p className="text-xs text-wimc-subtle mt-1">{new Date(err.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
