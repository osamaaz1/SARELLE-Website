'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/providers/toast-provider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading: authLoading, register } = useAuth();
  const { addToast } = useToast();
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [redirecting, setRedirecting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      setRedirecting(true);
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.displayName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!form.email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await register(form.email, form.password, 'customer', form.displayName);
      addToast('success', 'Account created!');
      router.replace('/dashboard');
    } catch (err: any) {
      const msg = err.message || 'Registration failed';
      if (msg.includes('already registered') || msg.includes('already exists')) {
        setError('An account with this email already exists');
      } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        setError('Cannot reach server. Please try again.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || redirecting) {
    return (
      <div className="min-h-screen bg-wimc-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-wimc-muted">{redirecting ? 'Redirecting...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-wimc-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl font-bold">Join WIMC</h1>
          <p className="text-wimc-muted mt-2">Buy and sell luxury pre-loved items</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-wimc-surface border border-wimc-border rounded-xl p-8 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}
          <Input label="Display Name" value={form.displayName} onChange={(e) => { setForm({ ...form, displayName: e.target.value }); setError(''); }} required placeholder="Your name" />
          <Input label="Email" type="email" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setError(''); }} required placeholder="you@example.com" />
          <Input label="Password" type="password" value={form.password} onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(''); }} required placeholder="Min 8 characters" />

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
