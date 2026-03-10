# Frontend Routes & Pages

## Route Groups

Next.js App Router with four route groups and auth routes:

| Group | Layout | Auth Required | Components |
|-------|--------|--------------|------------|
| `(public)` | Navbar + Footer | No | Homepage, browse, listing, celebrities, closet, policies |
| `(dashboard)` | Navbar only | Yes (any role) | Buyer dashboard, orders, offers, checkout |
| `(seller)` | Navbar + Sidebar | Yes (seller/vip_seller) | Seller dashboard, submissions, payouts |
| `(admin)` | Navbar + Sidebar | Yes (admin) | Full admin panel |
| `auth/` | Minimal | No | Login, register |

## Public Routes

| Path | File | Purpose |
|------|------|---------|
| `/` | `(public)/page.tsx` | Homepage: hero auction, celebrity closets carousel, trending grid |
| `/browse` | `(public)/browse/page.tsx` | Marketplace: search, category/brand/condition filters, sort, pagination |
| `/listing/[id]` | `(public)/listing/[id]/page.tsx` | Item detail: images, price/auction, bid modal, offer modal, bid history |
| `/celebrities` | `(public)/celebrities/page.tsx` | Celebrity grid with modal detail view |
| `/closet/[sellerId]` | `(public)/closet/[sellerId]/page.tsx` | Seller's public closet (exists but not linked from home) |
| `/policies` | `(public)/policies/page.tsx` | Static: process, fees, buyer protection |

## Dashboard Routes

| Path | File | Purpose |
|------|------|---------|
| `/dashboard` | `(dashboard)/dashboard/page.tsx` | Buyer home: order stats, active orders preview |
| `/orders` | `(dashboard)/orders/page.tsx` | Order list with status badges |
| `/orders/[id]` | `(dashboard)/orders/[id]/page.tsx` | Order detail: item, tracking, timeline, breakdown |
| `/offers` | `(dashboard)/offers/page.tsx` | Sent offers list, withdraw pending |
| `/checkout/[listingId]` | `(dashboard)/checkout/[listingId]/page.tsx` | Checkout: address form, order summary. Query param `?auction_id=` for auction winner |

## Seller Routes

| Path | File | Purpose |
|------|------|---------|
| `/seller/dashboard` | `(seller)/seller/dashboard/page.tsx` | Seller stats: submissions, listings, earnings, tier badge |
| `/seller/submit` | `(seller)/seller/submit/page.tsx` | New submission: photo upload, item details form |
| `/seller/submissions` | `(seller)/seller/submissions/page.tsx` | Submission history with stage badges |
| `/seller/submissions/[id]` | `(seller)/seller/submissions/[id]/page.tsx` | Submission detail + stage timeline |
| `/seller/offers` | `(seller)/seller/offers/page.tsx` | Received offers, accept/reject |
| `/seller/payouts` | `(seller)/seller/payouts/page.tsx` | Payout history |

## Admin Routes

| Path | File | Purpose |
|------|------|---------|
| `/admin` | `(admin)/admin/page.tsx` | Dashboard: 5 stat cards, pipeline overview |
| `/admin/submissions` | `(admin)/admin/submissions/page.tsx` | Submission queue, filter by stage |
| `/admin/submissions/[id]` | `(admin)/admin/submissions/[id]/page.tsx` | Review form: approve/reject with price |
| `/admin/pickups` | `(admin)/admin/pickups/page.tsx` | Schedule pickup, dispatch driver |
| `/admin/qc` | `(admin)/admin/qc/page.tsx` | Quality control / authentication reports |
| `/admin/listings` | `(admin)/admin/listings/page.tsx` | Create/manage listings from submissions |
| `/admin/orders` | `(admin)/admin/orders/page.tsx` | Order management, status updates |
| `/admin/payouts` | `(admin)/admin/payouts/page.tsx` | Trigger and manage payouts |
| `/admin/sellers` | `(admin)/admin/sellers/page.tsx` | Seller management |
| `/admin/celebrities` | `(admin)/admin/celebrities/page.tsx` | Celebrity profiles management |

## Auth Routes

| Path | File | Purpose |
|------|------|---------|
| `/auth/login` | `auth/login/page.tsx` | Login form, redirect param support |
| `/auth/register` | `auth/register/page.tsx` | Registration with role selection (buyer/seller) |

## Middleware

Protected paths: `/dashboard/*`, `/orders/*`, `/offers/*`, `/checkout/*`, `/seller/*`, `/admin/*`.
Checks for `wimc_token` cookie. Redirects to `/auth/login?redirect=...` if missing.

**Gap**: No server-side role check in middleware. Admin/seller route protection is client-side only.

## Component Library

### UI Components (`components/ui/`)
Button, Input, Select, Badge, Card, Modal, Avatar, LoadingSpinner, EmptyState, SearchBar, StatCard, PhotoUploader, PullToRefresh

### Marketplace Components (`components/marketplace/`)
ProductCard, ImageGallery, FilterPanel, OfferModal, CheckoutBreakdown, OrderStatusTimeline

### Layout Components (`components/layout/`)
Navbar, Footer, Sidebar (admin + seller variants)
