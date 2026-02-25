'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-wimc-bg border-t border-wimc-border mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-heading text-xl font-bold mb-4">SARELLE</h3>
            <p className="text-sm text-wimc-subtle leading-relaxed">
              Authenticated luxury resale. Every item passes through our hub for professional verification and photography.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-4 text-wimc-muted uppercase tracking-wider">Shop</h4>
            <div className="space-y-2">
              <Link href="/browse" className="block text-sm text-wimc-subtle hover:text-white transition-colors">Browse All</Link>
              <Link href="/browse?category=Bags" className="block text-sm text-wimc-subtle hover:text-white transition-colors">Bags</Link>
              <Link href="/browse?category=Shoes" className="block text-sm text-wimc-subtle hover:text-white transition-colors">Shoes</Link>
              <Link href="/browse?category=Watches" className="block text-sm text-wimc-subtle hover:text-white transition-colors">Watches</Link>
              <Link href="/celebrities" className="block text-sm text-wimc-subtle hover:text-white transition-colors">Celebrity Closets</Link>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-4 text-wimc-muted uppercase tracking-wider">Sell</h4>
            <div className="space-y-2">
              <Link href="/seller/submit" className="block text-sm text-wimc-subtle hover:text-white transition-colors">Submit an Item</Link>
              <Link href="/policies" className="block text-sm text-wimc-subtle hover:text-white transition-colors">How It Works</Link>
              <Link href="/policies" className="block text-sm text-wimc-subtle hover:text-white transition-colors">Fees & Commissions</Link>
              <Link href="/policies" className="block text-sm text-wimc-subtle hover:text-white transition-colors">Authentication Process</Link>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-4 text-wimc-muted uppercase tracking-wider">Support</h4>
            <div className="space-y-2">
              <Link href="/policies" className="block text-sm text-wimc-subtle hover:text-white transition-colors">Buyer Protection</Link>
              <Link href="/policies" className="block text-sm text-wimc-subtle hover:text-white transition-colors">Return Policy</Link>
              <Link href="/policies" className="block text-sm text-wimc-subtle hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/policies" className="block text-sm text-wimc-subtle hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-wimc-border mt-10 pt-6 text-center">
          <p className="text-xs text-wimc-subtle">&copy; {new Date().getFullYear()} Sarelle. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
