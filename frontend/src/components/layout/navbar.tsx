'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { useState } from 'react';
import { Button } from '../ui/button';
import { Avatar } from '../ui/avatar';

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/browse', label: 'Shop' },
  { href: '/celebrities', label: 'Celebrities' },
  { href: '/seller/submit', label: 'Sell', requiresSeller: true },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobMenu, setMobMenu] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav className="sticky top-0 z-40 bg-[rgba(10,10,10,0.92)] backdrop-blur-[20px] border-b border-wimc-border">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex items-center justify-between h-[60px]">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Sarelle" className="h-20 w-auto -my-3" />
            <div>
              <span className="font-heading text-[22px] font-bold tracking-[1px] leading-none block">SARELLE</span>
              <span className="font-accent text-[13px] text-[#666] block">by Dina Bahgat</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-7">
            {NAV_ITEMS.map((item) => {
              if (item.requiresSeller && (!user || !['seller', 'vip_seller'].includes(user.role))) return null;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-[13px] tracking-[0.5px] transition-colors ${
                    active ? 'text-white font-bold' : 'text-[#888] hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            {/* Account nav item */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className={`text-[13px] tracking-[0.5px] transition-colors flex items-center gap-2 ${
                    pathname.startsWith('/dashboard') || pathname.startsWith('/orders') ? 'text-white font-bold' : 'text-[#888] hover:text-white'
                  }`}
                >
                  <Avatar src={user.avatar_url} name={user.display_name} size="sm" />
                  <span className="hidden lg:block">{user.display_name}</span>
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-wimc-surface border border-wimc-border rounded-lg shadow-xl z-50 py-1">
                      {user.role === 'admin' && (
                        <Link href="/admin" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-wimc-muted hover:text-white hover:bg-wimc-surface-alt">Admin Panel</Link>
                      )}
                      <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-wimc-muted hover:text-white hover:bg-wimc-surface-alt">Dashboard</Link>
                      <Link href="/orders" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-wimc-muted hover:text-white hover:bg-wimc-surface-alt">Orders</Link>
                      {['seller', 'vip_seller'].includes(user.role) && (
                        <>
                          <Link href="/seller/dashboard" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-wimc-muted hover:text-white hover:bg-wimc-surface-alt">Seller Dashboard</Link>
                          <Link href="/seller/submissions" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-wimc-muted hover:text-white hover:bg-wimc-surface-alt">My Submissions</Link>
                        </>
                      )}
                      <hr className="border-wimc-border my-1" />
                      <button onClick={() => { logout(); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-wimc-red hover:bg-wimc-surface-alt">Sign Out</button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
                <Link href="/auth/register"><Button size="sm">Join</Button></Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobMenu(!mobMenu)}
            className="md:hidden flex flex-col gap-1 bg-transparent border-none cursor-pointer"
          >
            <span className={`w-5 h-0.5 bg-white rounded-sm transition-all duration-200 ${mobMenu ? 'rotate-45 translate-y-[6px]' : ''}`} />
            <span className={`w-5 h-0.5 bg-white rounded-sm transition-opacity duration-200 ${mobMenu ? 'opacity-0' : ''}`} />
            <span className={`w-5 h-0.5 bg-white rounded-sm transition-all duration-200 ${mobMenu ? '-rotate-45 -translate-y-[6px]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobMenu && (
        <div className="md:hidden bg-wimc-surface border-b border-wimc-border px-6 py-2 pb-4">
          {NAV_ITEMS.map((item) => {
            if (item.requiresSeller && (!user || !['seller', 'vip_seller'].includes(user.role))) return null;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobMenu(false)}
                className={`block py-2.5 text-[14px] ${active ? 'text-white font-bold' : 'text-[#888]'}`}
              >
                {item.label}
              </Link>
            );
          })}
          {user ? (
            <>
              <Link href="/dashboard" onClick={() => setMobMenu(false)} className="block py-2.5 text-[14px] text-[#888]">Account</Link>
              <button onClick={() => { logout(); setMobMenu(false); }} className="block py-2.5 text-[14px] text-wimc-red">Sign Out</button>
            </>
          ) : (
            <div className="flex gap-2 pt-2">
              <Link href="/auth/login" onClick={() => setMobMenu(false)}><Button variant="ghost" size="sm">Sign In</Button></Link>
              <Link href="/auth/register" onClick={() => setMobMenu(false)}><Button size="sm">Join</Button></Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
