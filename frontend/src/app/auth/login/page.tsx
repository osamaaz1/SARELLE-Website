'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/providers/toast-provider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const TEST_ACCOUNTS = [
  { label: 'Admin', email: 'admin@whatinmycloset.com', password: 'Admin123!' },
  { label: 'Sara', email: 'sara@test.wimc.com', password: 'Seller123!' },
  { label: 'Reem', email: 'reem@test.wimc.com', password: 'Buyer123!' },
  { label: 'Yasmine', desc: 'Celebrity', email: 'yasmine@test.wimc.com', password: 'Celeb123!' },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const { login } = useAuth();
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      addToast('success', 'Welcome back!');
      router.push(redirectTo);
    } catch (err: any) {
      const msg = err.message || 'Login failed';
      // Make Supabase error messages user-friendly
      if (msg.includes('Invalid login')) {
        setError('Incorrect email or password');
      } else if (msg.includes('Email not confirmed')) {
        setError('Please confirm your email first');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const fillTestAccount = (account: typeof TEST_ACCOUNTS[0]) => {
    setEmail(account.email);
    setPassword(account.password);
  };

  return (
    <div className="min-h-screen bg-wimc-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl font-bold">Welcome Back</h1>
          <p className="text-wimc-muted mt-2">Sign in to your WIMC account</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-wimc-surface border border-wimc-border rounded-xl p-8 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}
          <Input label="Email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} required placeholder="you@example.com" />
          <Input label="Password" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} required placeholder="••••••••" />
          <Button type="submit" className="w-full" loading={loading}>Sign In</Button>
        </form>

        {/* Test accounts quick-fill (dev only) */}
        {process.env.NEXT_PUBLIC_USE_MOCK === 'true' && (
          <div className="mt-6 bg-wimc-surface border border-wimc-border rounded-xl p-5">
            <p className="text-xs text-wimc-muted mb-3 text-center">Test Accounts (click to fill)</p>
            <div className="grid grid-cols-2 gap-2">
              {TEST_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => fillTestAccount(account)}
                  className="text-left px-3 py-2.5 rounded-lg border border-wimc-border hover:border-wimc-muted transition-colors"
                >
                  <span className="block text-xs font-semibold text-white">{account.label}</span>
                  {'desc' in account && <span className="block text-[10px] text-wimc-muted">{account.desc}</span>}
                  <span className="block text-[11px] text-wimc-subtle truncate">{account.email}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-sm text-wimc-subtle mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-wimc-red hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
