'use client';
import { useState } from 'react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { formatPrice, CURRENCY_SYMBOL } from '@/lib/currency';

interface OfferModalProps {
  open: boolean;
  onClose: () => void;
  listingName: string;
  listingPrice: number;
  onSubmit: (amount: number) => Promise<void>;
}

export function OfferModal({ open, onClose, listingName, listingPrice, onSubmit }: OfferModalProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) { setError('Enter a valid amount'); return; }
    if (num >= listingPrice) { setError('Offer must be less than listing price'); return; }
    setError('');
    setLoading(true);
    try {
      await onSubmit(num);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Make an Offer">
      <div className="space-y-4">
        <p className="text-sm text-wimc-muted">
          Make an offer on <span className="text-white font-medium">{listingName}</span>
        </p>
        <p className="text-sm text-wimc-subtle">Listed price: <span className="text-white">{formatPrice(listingPrice)}</span></p>
        <Input
          label={`Your Offer (${CURRENCY_SYMBOL})`}
          type="number"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={error}
        />
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading}>Submit Offer</Button>
        </div>
      </div>
    </Modal>
  );
}
