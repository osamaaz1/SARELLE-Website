'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function ApiOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.getApiOverview()
      .then(setData)
      .catch((err) => setError(err.message || 'Failed to load API overview'))
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
  if (!data) return null;

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    parts.push(`${m}m`);
    return parts.join(' ');
  };

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">API Overview</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CORS */}
        <Card className="p-5">
          <h2 className="text-xs text-wimc-subtle uppercase tracking-wider mb-3">CORS Origins</h2>
          <div className="space-y-1">
            {data.cors_origins.map((origin: string, i: number) => (
              <p key={i} className="text-sm font-mono bg-wimc-bg px-3 py-1.5 rounded">{origin}</p>
            ))}
          </div>
        </Card>

        {/* Rate Limit */}
        <Card className="p-5">
          <h2 className="text-xs text-wimc-subtle uppercase tracking-wider mb-3">Rate Limiting</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-wimc-subtle">Window</p>
              <p className="text-lg font-heading font-bold">{data.rate_limit.ttl_ms / 1000}s</p>
            </div>
            <div>
              <p className="text-xs text-wimc-subtle">Max Requests</p>
              <p className="text-lg font-heading font-bold">{data.rate_limit.limit}</p>
            </div>
          </div>
        </Card>

        {/* Supabase Config */}
        <Card className="p-5">
          <h2 className="text-xs text-wimc-subtle uppercase tracking-wider mb-3">Supabase Configuration</h2>
          <div className="space-y-2">
            {Object.entries(data.supabase).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between">
                <p className="text-sm">{key.replace(/_/g, ' ')}</p>
                <Badge color={(val as boolean) ? '#22c55e' : '#ef4444'}>
                  {(val as boolean) ? 'Configured' : 'Missing'}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Commission Rates */}
        <Card className="p-5">
          <h2 className="text-xs text-wimc-subtle uppercase tracking-wider mb-3">Commission Rates</h2>
          <div className="space-y-2">
            {Object.entries(data.commission_rates).map(([tier, rate]) => (
              <div key={tier} className="flex items-center justify-between">
                <p className="text-sm capitalize">{tier}</p>
                <p className="text-sm font-medium">{rate as number}%</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Server Info */}
        <Card className="p-5 lg:col-span-2">
          <h2 className="text-xs text-wimc-subtle uppercase tracking-wider mb-3">Server Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-wimc-subtle">Uptime</p>
              <p className="text-lg font-heading font-bold text-green-400">{formatUptime(data.uptime_seconds)}</p>
            </div>
            <div>
              <p className="text-xs text-wimc-subtle">Node.js</p>
              <p className="text-sm font-mono">{data.node_version}</p>
            </div>
            <div>
              <p className="text-xs text-wimc-subtle">Environment</p>
              <Badge color={data.environment === 'production' ? '#22c55e' : '#f59e0b'}>{data.environment}</Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
