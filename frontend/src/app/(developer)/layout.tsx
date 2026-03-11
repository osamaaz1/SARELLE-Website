'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { useAuth } from '@/providers/auth-provider';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const developerLinks = [
  { href: '/developer', label: 'Dashboard', icon: 'dev-dashboard' },
  { href: '/developer/users', label: 'Users', icon: 'users' },
  { href: '/developer/audit-logs', label: 'Audit Logs', icon: 'audit' },
  { href: '/developer/error-logs', label: 'Error Logs', icon: 'errors' },
  { href: '/developer/sessions', label: 'Sessions', icon: 'sessions' },
  { href: '/developer/api-overview', label: 'API Overview', icon: 'api' },
];

export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/auth/login?redirect=/developer');
    } else if (user.role !== 'developer') {
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

  if (!user || user.role !== 'developer') {
    return null;
  }

  return (
    <div className="min-h-screen bg-wimc-bg">
      <Navbar />
      <div className="flex">
        <Sidebar links={developerLinks} title="Developer Panel" />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
