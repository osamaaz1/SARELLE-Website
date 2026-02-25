'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/providers/toast-provider';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { addToast } = useToast();
  const [form, setForm] = useState({ email: '', password: '', displayName: '', role: 'buyer' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form.email, form.password, form.role, form.displayName);
      addToast('success', 'Account created!');
      router.push(form.role === 'seller' ? '/seller/dashboard' : '/dashboard');
    } catch (err: any) {
      addToast('error', err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-wimc-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl font-bold">Join Sarelle</h1>
          <p className="text-wimc-muted mt-2">Create your account to buy or sell luxury items</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-wimc-surface border border-wimc-border rounded-xl p-8 space-y-5">
          <Input label="Display Name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required placeholder="Your name" />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="you@example.com" />
          <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required placeholder="Min 6 characters" />
          <Select
            label="I want to..."
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            options={[{ value: 'buyer', label: 'Buy luxury items' }, { value: 'seller', label: 'Sell luxury items' }]}
          />
          <Button type="submit" className="w-full" loading={loading}>Create Account</Button>
        </form>
        <p className="text-center text-sm text-wimc-subtle mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-wimc-red hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
