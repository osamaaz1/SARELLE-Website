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
import { PhotoUploader } from '@/components/ui/photo-uploader';
import { formatPrice, CURRENCY_SYMBOL } from '@/lib/currency';
import Image from 'next/image';

export default function AdminListingsPage() {
  const { addToast } = useToast();
  const [readyItems, setReadyItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishModal, setPublishModal] = useState<any>(null);
  const [listingForm, setListingForm] = useState({ price: '', original_price: '', description: '', featured: false });
  const [proPhotoFiles, setProPhotoFiles] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Photoshoot modal state
  const [photoshootModal, setPhotoshootModal] = useState<any>(null);
  const [photoshootFiles, setPhotoshootFiles] = useState<File[]>([]);
  const [photoshootDesc, setPhotoshootDesc] = useState('');
  const [photoshootUploading, setPhotoshootUploading] = useState(false);

  const fetchData = () => {
    setLoading(true);
    Promise.all([api.getAdminSubmissions('auth_passed'), api.getAdminSubmissions('photoshoot_done')])
      .then(([passed, photo]) => setReadyItems([...passed, ...photo]))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, []);

  const openPhotoshootModal = (sub: any) => {
    setPhotoshootModal(sub);
    setPhotoshootFiles([]);
    setPhotoshootDesc('');
  };

  const handlePhotoshootDone = async () => {
    if (photoshootFiles.length === 0) {
      addToast('error', 'Please upload at least one professional photo');
      return;
    }
    setPhotoshootUploading(true);
    try {
      // Upload photos first
      const { urls } = await api.uploadListingPhotos(photoshootModal.id, photoshootFiles);
      // Then mark photoshoot done with the URLs
      await api.markPhotoshootDone(photoshootModal.id, {
        pro_photos: urls,
        pro_description: photoshootDesc || undefined,
      });
      addToast('success', 'Photoshoot completed with photos uploaded');
      setPhotoshootModal(null);
      // Optimistic: update local stage
      setReadyItems(prev => prev.map(s =>
        s.id === photoshootModal.id ? { ...s, stage: 'photoshoot_done', pro_photos: urls } : s
      ));
    } catch (err: any) {
      addToast('error', err.message);
    } finally {
      setPhotoshootUploading(false);
    }
  };

  const openPublishModal = (sub: any) => {
    setPublishModal(sub);
    setListingForm({ price: sub.proposed_price?.toString() || '', original_price: '', description: '', featured: false });
    setExistingPhotos(sub.pro_photos?.length > 0 ? sub.pro_photos : []);
    setProPhotoFiles([]);
  };

  const handlePublish = async () => {
    if (!listingForm.price) { addToast('error', 'Enter a price'); return; }

    try {
      let newPhotoUrls: string[] = [];
      if (proPhotoFiles.length > 0) {
        setUploading(true);
        const { urls } = await api.uploadListingPhotos(publishModal.id, proPhotoFiles);
        newPhotoUrls = urls;
        setUploading(false);
      }

      const allPhotos = [...existingPhotos, ...newPhotoUrls];

      if (allPhotos.length === 0) {
        addToast('error', 'At least one professional photo is required for the listing');
        return;
      }

      await api.createListing({
        submission_id: publishModal.id,
        photos: allPhotos,
        description: listingForm.description || publishModal.pro_description || publishModal.description,
        price: parseFloat(listingForm.price),
        original_price: listingForm.original_price ? parseFloat(listingForm.original_price) : null,
        featured: listingForm.featured,
      });
      addToast('success', 'Item published!');
      setPublishModal(null);
      fetchData();
    } catch (err: any) {
      setUploading(false);
      addToast('error', err.message);
    }
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
              {sub.user_photos?.[0] && <Image src={sub.user_photos[0]} alt="" width={56} height={56} className="w-14 h-14 rounded-lg object-cover" unoptimized />}
              <div className="flex-1">
                <p className="font-medium text-sm">{sub.name}</p>
                <p className="text-xs text-wimc-subtle">{sub.brand} &middot; Proposed: {formatPrice(sub.proposed_price)}</p>
              </div>
              <Badge color={sub.stage === 'auth_passed' ? '#44DD66' : '#AA88FF'}>{sub.stage.replace(/_/g, ' ')}</Badge>
              {sub.stage === 'auth_passed' ? (
                <Button size="sm" variant="outline" onClick={() => openPhotoshootModal(sub)}>
                  Upload Pro Photos
                </Button>
              ) : (
                <Button size="sm" onClick={() => openPublishModal(sub)}>
                  Publish
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!publishModal} onClose={() => setPublishModal(null)} title="Publish Listing">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-wimc-muted mb-2 block">Listing Photos (professional photos only — these will appear on the marketplace)</label>
            <PhotoUploader
              files={proPhotoFiles}
              onFilesChange={setProPhotoFiles}
              existingUrls={existingPhotos}
              onRemoveExisting={(i) => setExistingPhotos(existingPhotos.filter((_, idx) => idx !== i))}
              maxPhotos={12}
              uploading={uploading}
            />
          </div>
          <Input label={`Final Price (${CURRENCY_SYMBOL})`} type="number" value={listingForm.price} onChange={(e) => setListingForm({ ...listingForm, price: e.target.value })} />
          <Input label={`Original Price (${CURRENCY_SYMBOL}) — leave empty for no discount`} type="number" value={listingForm.original_price} onChange={(e) => setListingForm({ ...listingForm, original_price: e.target.value })} placeholder="Only fill if you want to show a discount" />
          <div className="space-y-1.5">
            <label className="text-sm text-wimc-muted">Description (optional override)</label>
            <textarea value={listingForm.description} onChange={(e) => setListingForm({ ...listingForm, description: e.target.value })} rows={3} placeholder="Override item description..." className="w-full bg-wimc-surface border border-wimc-border rounded-lg px-4 py-2.5 text-[16px] leading-normal text-white placeholder:text-wimc-subtle focus:outline-none focus:border-wimc-border-alt resize-none" />
          </div>
          <label className="flex items-center gap-2 text-sm text-wimc-muted cursor-pointer">
            <input type="checkbox" checked={listingForm.featured} onChange={(e) => setListingForm({ ...listingForm, featured: e.target.checked })} className="rounded" />
            Featured item
          </label>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setPublishModal(null)}>Cancel</Button>
            <Button onClick={handlePublish} loading={uploading}>
              {uploading ? 'Uploading...' : 'Publish to Marketplace'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Photoshoot Upload Modal */}
      <Modal open={!!photoshootModal} onClose={() => !photoshootUploading && setPhotoshootModal(null)} title="Upload Professional Photos">
        <div className="space-y-4">
          <p className="text-sm text-wimc-subtle">
            Upload the professional photos for <strong className="text-white">{photoshootModal?.name}</strong>. These will be the photos shown on the marketplace listing (customer photos will not be displayed).
          </p>
          <div>
            <label className="text-sm text-wimc-muted mb-2 block">Professional Photos *</label>
            <PhotoUploader
              files={photoshootFiles}
              onFilesChange={setPhotoshootFiles}
              maxPhotos={12}
              uploading={photoshootUploading}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-wimc-muted">Professional Description (optional)</label>
            <textarea
              value={photoshootDesc}
              onChange={(e) => setPhotoshootDesc(e.target.value)}
              rows={3}
              placeholder="Professional description to replace the seller's original..."
              className="w-full bg-wimc-surface border border-wimc-border rounded-lg px-4 py-2.5 text-[16px] leading-normal text-white placeholder:text-wimc-subtle focus:outline-none focus:border-wimc-border-alt resize-none"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setPhotoshootModal(null)} disabled={photoshootUploading}>Cancel</Button>
            <Button onClick={handlePhotoshootDone} loading={photoshootUploading}>
              {photoshootUploading ? 'Uploading...' : 'Complete Photoshoot'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
