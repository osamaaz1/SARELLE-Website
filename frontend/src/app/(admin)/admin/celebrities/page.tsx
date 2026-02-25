'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/providers/toast-provider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';

export default function AdminCelebritiesPage() {
  const { addToast } = useToast();
  const [celebrities, setCelebrities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '', followers: '' });

  const fetchData = () => {
    setLoading(true);
    api.getAdminCelebrities().then(setCelebrities).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    if (!form.name) { addToast('error', 'Name required'); return; }
    try {
      await api.createCelebrity(form);
      addToast('success', 'Celebrity added');
      setShowCreate(false);
      setForm({ name: '', bio: '', followers: '' });
      fetchData();
    } catch (err: any) { addToast('error', err.message); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold">Celebrity Management</h1>
        <Button onClick={() => setShowCreate(true)}>Add Celebrity</Button>
      </div>

      {celebrities.length === 0 ? (
        <EmptyState title="No celebrities" description="Add celebrity profiles to feature their closets" />
      ) : (
        <div className="space-y-3">
          {celebrities.map((celeb: any) => (
            <Card key={celeb.id} className="p-5 flex items-center gap-4">
              <Avatar src={celeb.avatar_url} name={celeb.name} size="lg" />
              <div className="flex-1">
                <p className="font-medium">{celeb.name}</p>
                <p className="text-sm text-wimc-subtle">{celeb.bio}</p>
              </div>
              <Badge color="#AA88FF">{celeb.followers}</Badge>
              {celeb.verified && <Badge color="#44DD66">Verified</Badge>}
            </Card>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Celebrity">
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Celebrity name" />
          <Input label="Bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Brief bio" />
          <Input label="Followers" value={form.followers} onChange={(e) => setForm({ ...form, followers: e.target.value })} placeholder="e.g., 2.5M" />
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Add Celebrity</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
