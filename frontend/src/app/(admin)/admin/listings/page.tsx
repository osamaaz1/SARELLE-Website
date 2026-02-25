'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/providers/toast-provider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';

export default function AdminListingsPage() {
  const { addToast } = useToast();
  const [readyItems, setReadyItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishModal, setPublishModal] = useState<any>(null);
  const [listingForm, setListingForm] = useState({ price: '', description: '', featured: false });

  const fetchData = () => {
    setLoading(true);
    Promise.all([api.getAdminSubmissions('auth_passed'), api.getAdminSubmissions('photoshoot_done')])
      .then(([passed, photo]) => setReadyItems([...passed, ...photo]))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, []);

  const handlePublish = async () => {
    if (!listingForm.price) { addToast('error', 'Enter a price'); return; }
    try {
      await api.createListing({
        submission_id: publishModal.id,
        photos: publishModal.pro_photos?.length > 0 ? publishModal.pro_photos : publishModal.user_photos || [],
        description: listingForm.description || publishModal.description,
        price: parseFloat(listingForm.price),
        featured: listingForm.featured,
      });
      addToast('success', 'Item published!');
      setPublishModal(null);
      fetchData();
    } catch (err: any) { addToast('error', err.message); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">Listing Management</h1>
      {readyItems.length === 0 ? (
        <EmptyState title="No items ready" description="Authenticated items will appear here for listing" />
      ) : (
        <div className="space-y-3">
          {readyItems.map((sub: any) => (
            <Card key={sub.id} className="p-5 flex items-center gap-4">
              {sub.user_photos?.[0] && <img src={sub.user_photos[0]} alt="" className="w-14 h-14 rounded-lg object-cover" />}
              <div className="flex-1">
                <p className="font-medium text-sm">{sub.name}</p>
                <p className="text-xs text-wimc-subtle">{sub.brand} &middot; Proposed: ${sub.proposed_price?.toLocaleString()}</p>
              </div>
              <Badge color={sub.stage === 'auth_passed' ? '#44DD66' : '#AA88FF'}>{sub.stage.replace(/_/g, ' ')}</Badge>
              <Button size="sm" onClick={() => { setPublishModal(sub); setListingForm({ price: sub.proposed_price?.toString() || '', description: '', featured: false }); }}>
                Publish
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!publishModal} onClose={() => setPublishModal(null)} title="Publish Listing">
        <div className="space-y-4">
          <Input label="Final Price ($)" type="number" value={listingForm.price} onChange={(e) => setListingForm({ ...listingForm, price: e.target.value })} />
          <div className="space-y-1.5">
            <label className="text-sm text-wimc-muted">Description (optional override)</label>
            <textarea value={listingForm.description} onChange={(e) => setListingForm({ ...listingForm, description: e.target.value })} rows={3} placeholder="Override item description..." className="w-full bg-wimc-surface border border-wimc-border rounded-lg px-4 py-2.5 text-white placeholder:text-wimc-subtle focus:outline-none focus:border-wimc-border-alt resize-none" />
          </div>
          <label className="flex items-center gap-2 text-sm text-wimc-muted cursor-pointer">
            <input type="checkbox" checked={listingForm.featured} onChange={(e) => setListingForm({ ...listingForm, featured: e.target.checked })} className="rounded" />
            Featured item
          </label>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setPublishModal(null)}>Cancel</Button>
            <Button onClick={handlePublish}>Publish to Marketplace</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
