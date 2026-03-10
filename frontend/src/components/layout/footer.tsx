import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-wimc-bg border-t border-wimc-border mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-heading text-xl font-bold mb-4">WIMC</h3>
            <p className="text-sm text-wimc-subtle leading-relaxed">
              Authenticated luxury resale. Every item passes through our hub for professional verification and photography.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-4 text-wimc-muted uppercase tracking-wider">Shop</h4>
            <div className="space-y-1">
              <Link href="/browse" className="block text-sm text-wimc-subtle hover:text-white transition-colors py-2">Browse All</Link>
              <Link href="/browse?category=Bags" className="block text-sm text-wimc-subtle hover:text-white transition-colors py-2">Bags</Link>
              <Link href="/browse?category=Shoes" className="block text-sm text-wimc-subtle hover:text-white transition-colors py-2">Shoes</Link>
              <Link href="/browse?category=Watches" className="block text-sm text-wimc-subtle hover:text-white transition-colors py-2">Watches</Link>
              <Link href="/celebrities" className="block text-sm text-wimc-subtle hover:text-white transition-colors py-2">Celebrity Closets</Link>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-4 text-wimc-muted uppercase tracking-wider">Sell</h4>
            <div className="space-y-1">
              <Link href="/seller/submit" className="block text-sm text-wimc-subtle hover:text-white transition-colors py-2">Submit an Item</Link>
              <Link href="/policies" className="block text-sm text-wimc-subtle hover:text-white transition-colors py-2">How It Works</Link>
              <Link href="/policies" className="block text-sm text-wimc-subtle hover:text-white transition-colors py-2">Fees & Commissions</Link>
              <Link href="/policies" className="block text-sm text-wimc-subtle hover:text-white transition-colors py-2">Authentication Process</Link>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-4 text-wimc-muted uppercase tracking-wider">Support</h4>
            <div className="space-y-1">
              <Link href="/policies" className="block text-sm text-wimc-subtle hover:text-white transition-colors py-2">Buyer Protection</Link>
              <Link href="/policies" className="block text-sm text-wimc-subtle hover:text-white transition-colors py-2">Return Policy</Link>
              <Link href="/policies" className="block text-sm text-wimc-subtle hover:text-white transition-colors py-2">Privacy Policy</Link>
              <Link href="/policies" className="block text-sm text-wimc-subtle hover:text-white transition-colors py-2">Terms of Service</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-wimc-border mt-10 pt-6 text-center">
          <p className="text-xs text-wimc-subtle">&copy; {new Date().getFullYear()} WIMC. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
