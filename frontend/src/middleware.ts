import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/orders', '/offers', '/checkout', '/seller', '/admin'];

// Routes that require specific roles
const sellerRoutes = ['/seller'];
const adminRoutes = ['/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route is protected
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  if (!isProtected) return NextResponse.next();

  // Check for auth token in cookies
  const token =
    request.cookies.get('wimc_token')?.value ||
    request.cookies.get('sb-access-token')?.value ||
    Array.from(request.cookies.getAll()).find((c) => c.name.includes('auth-token'))?.value;

  if (!token) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/orders/:path*',
    '/offers/:path*',
    '/checkout/:path*',
    '/seller/:path*',
    '/admin/:path*',
  ],
};
