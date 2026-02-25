import { Navbar } from '@/components/layout/navbar';
import { Sidebar } from '@/components/layout/sidebar';

const sellerLinks = [
  { href: '/seller/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/seller/submit', label: 'Submit Item', icon: 'submissions' },
  { href: '/seller/submissions', label: 'My Submissions', icon: 'listings' },
  { href: '/seller/offers', label: 'Received Offers', icon: 'offers' },
  { href: '/seller/payouts', label: 'Payouts', icon: 'payouts' },
];

export default function SellerLayout({ children }: { children: React.ReactNode }) {
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
