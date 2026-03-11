'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { useAuth } from '@/providers/auth-provider';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const adminLinks = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
  { href: '/admin/submissions', label: 'Submissions', icon: 'submissions' },
  { href: '/admin/pickups', label: 'Pickups', icon: 'pickups' },
  { href: '/admin/qc', label: 'QC / Auth', icon: 'qc' },
  { href: '/admin/listings', label: 'Listings', icon: 'listings' },
  { href: '/admin/orders', label: 'Orders', icon: 'orders' },
  { href: '/admin/payouts', label: 'Payouts', icon: 'payouts' },
  { href: '/admin/sellers', label: 'Sellers', icon: 'sellers' },
  { href: '/admin/celebrities', label: 'Celebrities', icon: 'celebrities' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/auth/login?redirect=/admin');
    } else if (user.role !== 'admin') {
      router.replace('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-wimc-bg flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-wimc-bg">
      <Navbar />
      <div className="flex">
        <Sidebar links={adminLinks} title="Admin Panel" />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
