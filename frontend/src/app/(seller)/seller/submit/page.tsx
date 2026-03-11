'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useToast } from '@/providers/toast-provider';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PhotoUploader } from '@/components/ui/photo-uploader';

const CATEGORIES = [
  { value: 'Bags', label: 'Bags' }, { value: 'Shoes', label: 'Shoes' },
  { value: 'Clothing', label: 'Clothing' }, { value: 'Watches', label: 'Watches' },
  { value: 'Jewellery', label: 'Jewellery' },
];
const BRANDS = [
  { value: 'Hermès', label: 'Hermès' }, { value: 'Chanel', label: 'Chanel' },
  { value: 'Louis Vuitton', label: 'Louis Vuitton' }, { value: 'Gucci', label: 'Gucci' },
  { value: 'Dior', label: 'Dior' }, { value: 'Prada', label: 'Prada' },
  { value: 'Louboutin', label: 'Louboutin' }, { value: 'Cartier', label: 'Cartier' },
  { value: 'Rolex', label: 'Rolex' }, { value: 'Fendi', label: 'Fendi' },
  { value: 'Valentino', label: 'Valentino' }, { value: 'Other', label: 'Other' },
];
const CONDITIONS = [
  { value: 'Like New', label: 'Like New' }, { value: 'Excellent', label: 'Excellent' },
  { value: 'Very Good', label: 'Very Good' }, { value: 'Good', label: 'Good' },
];

export default function SellerSubmitPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [form, setForm] = useState({ brand: 'Hermès', name: '', category: 'Bags', condition: 'Like New', color: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (photoFiles.length === 0) { addToast('error', 'Please add at least one photo'); return; }
    setLoading(true);
    setUploading(true);
    try {
      const tempId = crypto.randomUUID();
      const { urls } = await api.uploadSubmissionPhotos(tempId, photoFiles);
      setUploading(false);
      await api.createSubmission({ ...form, user_photos: urls });
      addToast('success', 'Item submitted for review!');
      router.push('/seller/submissions');
    } catch (err: any) {
      setUploading(false);
      addToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="font-heading text-2xl font-bold mb-2">Submit an Item</h1>
      <p className="text-wimc-muted text-sm mb-8">Upload photos and details. Our team will review and propose a price.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="text-sm text-wimc-muted mb-2 block">Photos</label>
          <PhotoUploader files={photoFiles} onFilesChange={setPhotoFiles} maxPhotos={8} uploading={uploading} />
        </div>
        <Select label="Brand" options={BRANDS} value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
        <Input label="Item Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g., Birkin 30 Togo Leather" />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Category" options={CATEGORIES} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <Select label="Condition" options={CONDITIONS} value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} />
        </div>
        <Input label="Color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="e.g., Gold, Black, Etoupe" />
        <div className="space-y-1.5">
          <label className="text-sm text-wimc-muted">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
            rows={4}
            placeholder="Describe the item, any signs of wear, included accessories..."
            className="w-full bg-wimc-surface border border-wimc-border rounded-lg px-4 py-2.5 text-[16px] leading-normal text-white placeholder:text-wimc-subtle focus:outline-none focus:border-wimc-border-alt transition-colors resize-none"
          />
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {uploading ? 'Uploading photos...' : 'Submit for Review'}
        </Button>
      </form>
    </div>
  );
}
