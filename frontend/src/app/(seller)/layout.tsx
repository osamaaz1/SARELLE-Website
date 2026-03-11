'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { useAuth } from '@/providers/auth-provider';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const sellerLinks = [
  { href: '/seller/dashboard', label: 'My Products', icon: 'listings' },
  { href: '/seller/submit', label: 'Submit Item', icon: 'submissions' },
  { href: '/seller/submissions', label: 'My Submissions', icon: 'dashboard' },
  { href: '/seller/offers', label: 'Received Offers', icon: 'offers' },
  { href: '/seller/payouts', label: 'Payouts', icon: 'payouts' },
  { href: '/orders', label: 'My Purchases', icon: 'orders' },
];

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
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
    return null;
  }

  return (
    <div className="min-h-screen bg-wimc-bg">
      <Navbar />
      <div className="flex">
        <Sidebar links={sellerLinks} title="Seller Panel" />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
