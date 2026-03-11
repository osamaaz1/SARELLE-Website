'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';

const ROLES = ['customer', 'celebrity', 'admin', 'developer'];
const ROLE_COLORS: Record<string, string> = {
  customer: '#3b82f6',
  celebrity: '#a855f7',
  admin: '#ef4444',
  developer: '#f59e0b',
};

export default function DeveloperUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [disabledFilter, setDisabledFilter] = useState('');

  // Role change modal
  const [roleModal, setRoleModal] = useState<{ user: any; newRole: string } | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);

  // Disable confirm modal
  const [disableModal, setDisableModal] = useState<any | null>(null);
  const [disableLoading, setDisableLoading] = useState(false);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    setError(null);
    const params: Record<string, string> = { page: String(page) };
    if (search) params.search = search;
    if (roleFilter) params.role = roleFilter;
    if (disabledFilter) params.disabled = disabledFilter;

    api.getDeveloperUsers(params)
      .then((res) => {
        setUsers(res.users);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch((err) => setError(err.message || 'Failed to load users'))
      .finally(() => setLoading(false));
  }, [page, search, roleFilter, disabledFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleRoleChange = async () => {
    if (!roleModal) return;
    setRoleLoading(true);
    try {
      await api.changeUserRole(roleModal.user.id, roleModal.newRole);
      setRoleModal(null);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to change role');
    } finally {
      setRoleLoading(false);
    }
  };

  const handleToggleDisable = async () => {
    if (!disableModal) return;
    setDisableLoading(true);
    try {
      const disable = !disableModal.disabled_at;
      await api.toggleUserDisable(disableModal.id, disable);
      setDisableModal(null);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle account status');
    } finally {
      setDisableLoading(false);
    }
  };

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">User Management</h1>

      <Card className="p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 min-w-[200px]"
          />
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="bg-wimc-bg border border-wimc-border rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">All Roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select
            value={disabledFilter}
            onChange={(e) => { setDisabledFilter(e.target.value); setPage(1); }}
            className="bg-wimc-bg border border-wimc-border rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">All Status</option>
            <option value="false">Active</option>
            <option value="true">Disabled</option>
          </select>
        </div>
      </Card>

      {loading ? <LoadingSpinner /> : error ? (
        <div className="text-center py-12">
          <p className="text-wimc-subtle mb-4">{error}</p>
          <Button onClick={fetchUsers}>Try Again</Button>
        </div>
      ) : users.length === 0 ? (
        <EmptyState title="No users found" description="Try adjusting your filters" />
      ) : (
        <>
          <p className="text-xs text-wimc-subtle mb-3">{total} user{total !== 1 ? 's' : ''}</p>
          <div className="space-y-2">
            {users.map((u) => (
              <Card key={u.id} className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-wimc-surface-alt flex items-center justify-center text-sm font-bold">
                  {(u.display_name || u.email || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.display_name || 'No name'}</p>
                  <p className="text-xs text-wimc-subtle truncate">{u.email}</p>
                </div>
                <Badge color={ROLE_COLORS[u.role] || '#666'}>{u.role}</Badge>
                {u.disabled_at && <Badge color="#ef4444">Disabled</Badge>}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => setRoleModal({ user: u, newRole: u.role })}
                    className="text-xs text-wimc-muted hover:text-white px-2 py-1 rounded bg-wimc-surface-alt hover:bg-wimc-border transition-colors"
                  >
                    Change Role
                  </button>
                  <button
                    onClick={() => setDisableModal(u)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      u.disabled_at
                        ? 'text-green-400 bg-green-500/10 hover:bg-green-500/20'
                        : 'text-red-400 bg-red-500/10 hover:bg-red-500/20'
                    }`}
                  >
                    {u.disabled_at ? 'Enable' : 'Disable'}
                  </button>
                </div>
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

      {/* Role Change Modal */}
      <Modal open={!!roleModal} onClose={() => setRoleModal(null)} title="Change User Role">
        {roleModal && (
          <div>
            <p className="text-sm text-wimc-subtle mb-4">
              Changing role for <strong className="text-white">{roleModal.user.display_name || roleModal.user.email}</strong>
            </p>
            <select
              value={roleModal.newRole}
              onChange={(e) => setRoleModal({ ...roleModal, newRole: e.target.value })}
              className="w-full bg-wimc-bg border border-wimc-border rounded-lg px-3 py-2 text-sm text-white mb-4"
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setRoleModal(null)}>Cancel</Button>
              <Button
                onClick={handleRoleChange}
                disabled={roleLoading || roleModal.newRole === roleModal.user.role}
              >
                {roleLoading ? 'Saving...' : 'Confirm'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Disable/Enable Confirm Modal */}
      <Modal open={!!disableModal} onClose={() => setDisableModal(null)} title={disableModal?.disabled_at ? 'Enable Account' : 'Disable Account'}>
        {disableModal && (
          <div>
            <p className="text-sm text-wimc-subtle mb-4">
              Are you sure you want to {disableModal.disabled_at ? 'enable' : 'disable'} the account for{' '}
              <strong className="text-white">{disableModal.display_name || disableModal.email}</strong>?
            </p>
            {!disableModal.disabled_at && (
              <p className="text-xs text-red-400 mb-4">
                This will prevent the user from logging in and ban their Supabase Auth account.
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDisableModal(null)}>Cancel</Button>
              <Button
                onClick={handleToggleDisable}
                disabled={disableLoading}
                className={disableModal.disabled_at ? '' : '!bg-red-600 hover:!bg-red-700'}
              >
                {disableLoading ? 'Processing...' : (disableModal.disabled_at ? 'Enable' : 'Disable')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
