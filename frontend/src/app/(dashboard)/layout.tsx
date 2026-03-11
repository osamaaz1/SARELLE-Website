'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { useAuth } from '@/providers/auth-provider';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-wimc-bg flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    // Auth resolved, no user — redirect is firing, render nothing
    return null;
  }

  return (
    <div className="min-h-screen bg-wimc-bg">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
