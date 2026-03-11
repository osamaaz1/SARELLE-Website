'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';

const ROLE_COLORS: Record<string, string> = {
  customer: '#3b82f6',
  celebrity: '#a855f7',
  admin: '#ef4444',
  developer: '#f59e0b',
};

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoutModal, setLogoutModal] = useState<any | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const fetchSessions = () => {
    setLoading(true);
    setError(null);
    api.getActiveSessions()
      .then(setSessions)
      .catch((err) => setError(err.message || 'Failed to load sessions'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSessions(); }, []);

  const handleForceLogout = async () => {
    if (!logoutModal) return;
    setLogoutLoading(true);
    try {
      await api.forceLogoutUser(logoutModal.id);
      setLogoutModal(null);
      fetchSessions();
    } catch (err: any) {
      alert(err.message || 'Failed to force logout');
    } finally {
      setLogoutLoading(false);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold">Active Sessions</h1>
        <Button variant="outline" size="sm" onClick={fetchSessions}>Refresh</Button>
      </div>

      {loading ? <LoadingSpinner /> : error ? (
        <div className="text-center py-12">
          <p className="text-wimc-subtle mb-4">{error}</p>
          <Button onClick={fetchSessions}>Try Again</Button>
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState title="No sessions" description="No active user sessions found" />
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <Card key={s.id} className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-wimc-surface-alt flex items-center justify-center text-sm font-bold">
                {(s.display_name || s.email || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{s.display_name}</p>
                <p className="text-xs text-wimc-subtle truncate">{s.email}</p>
              </div>
              <Badge color={ROLE_COLORS[s.role] || '#666'}>{s.role}</Badge>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-wimc-subtle">Last active</p>
                <p className="text-xs font-medium">{s.last_sign_in_at ? timeAgo(s.last_sign_in_at) : 'Never'}</p>
              </div>
              <button
                onClick={() => setLogoutModal(s)}
                className="text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded transition-colors flex-shrink-0"
              >
                Force Logout
              </button>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!logoutModal} onClose={() => setLogoutModal(null)} title="Force Logout">
        {logoutModal && (
          <div>
            <p className="text-sm text-wimc-subtle mb-4">
              Are you sure you want to force logout <strong className="text-white">{logoutModal.display_name || logoutModal.email}</strong>?
              This will invalidate all their active sessions.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setLogoutModal(null)}>Cancel</Button>
              <Button
                onClick={handleForceLogout}
                disabled={logoutLoading}
                className="!bg-red-600 hover:!bg-red-700"
              >
                {logoutLoading ? 'Processing...' : 'Force Logout'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
