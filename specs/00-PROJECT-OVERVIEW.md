# WIMC Project Overview

## Product Identity

| Field | Value |
|-------|-------|
| **Name** | WHATINMYCLOSET (WIMC) |
| **Domain** | whatinmycloset.com |
| **Tagline** | "by Dina Bahgat" |
| **Type** | Luxury pre-loved items resale marketplace |
| **Market** | Egypt / Middle East (EGP currency, Cairo addresses, Egyptian phone numbers) |
| **Categories** | Bags, Shoes, Watches, Jewellery, Clothing |

## Business Model

Sellers submit items for consignment. WIMC handles authentication, professional photography, listing, and fulfillment. Buyers browse, bid (auctions), make offers, or buy now. Celebrity closets are a premium feature.

**Revenue**: Platform takes a commission on each sale (tier-based: 12%--20%).

| Seller Tier | Min Points | Commission |
|-------------|-----------|------------|
| Bronze | 0 | 20% |
| Silver | 500 | 18% |
| Gold | 1,500 | 15% |
| Platinum | 5,000 | 12% |

Additional revenue: 20% service fee on buyer-side, flat EGP 50 shipping.

## Architecture

**Monorepo** with four directories:

```
frontend/    Next.js 14 (App Router) + Tailwind CSS + TypeScript
backend/     NestJS 10 + Supabase (PostgreSQL + Auth) + TypeScript
shared/      Shared TypeScript types and constants (not an npm package)
wimc/        Legacy Vite prototype (reference only, not production)
```

### Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | Next.js (App Router) | 14.2.21 |
| Frontend Styling | Tailwind CSS | 3.4.16 |
| Backend Framework | NestJS | 10.x |
| Database | PostgreSQL (via Supabase) | -- |
| Auth | Supabase Auth (JWT) | -- |
| File Storage | Supabase Storage | -- |
| Email | Resend (transactional, `EmailModule`) | 6.9.3 |
| File Upload | Multer + Supabase Storage (`StorageModule`) | -- |
| Real-time | Socket.io (`GatewayModule`) | 4.8.1 |
| Deployment | Render.com | Free tier |
| Icons | lucide-react | 0.468.0 |
| State | React Query (available) + useState/useEffect | 5.62.8 |

### Design System

| Token | Value |
|-------|-------|
| Background | #0A0A0A |
| Surface | #141414 |
| Surface Alt | #1C1C1C |
| Border | #222222 |
| Text White | #FFFFFF |
| Text Muted | #AAAAAA |
| Text Subtle | #666666 |
| Accent Red | #FF4444 |
| Success Green | #44DD66 |
| Heading Font | Playfair Display (serif) |
| Body Font | DM Sans (sans-serif) |
| Accent Font | Dancing Script (cursive) |

## User Roles

| Role | Capabilities |
|------|-------------|
| **Buyer** | Browse, search, save items, place offers, place bids, checkout, view orders |
| **Seller** | Submit items, accept/reject prices, view submissions, view payouts |
| **VIP Seller** | Same as seller + celebrity closet features, reserve price on auctions |
| **Admin** | Full dashboard, review submissions, schedule pickups, QC, create listings, manage orders, trigger payouts, manage celebrities, create/end auctions |

## Core Workflows

### 1. Submission Pipeline
```
pending_review -> price_suggested -> price_accepted -> pickup_scheduled
-> driver_dispatched -> arrived_at_office -> auth_passed/auth_failed
-> photoshoot_done -> listed
```

### 2. Order Pipeline
```
pending_payment -> paid -> processing -> shipped -> delivered -> completed
                                                               -> disputed
```

### 3. Auction Pipeline
```
Admin creates auction (active) -> Buyers place proxy bids
-> Anti-snipe extends time -> Auction ends
-> If reserve met + winner: listing reserved, winner checkouts
-> If reserve not met: no sale, listing stays published
```

## Database

17 tables, all prefixed `wimc_`. Row Level Security enabled on all tables. Full schema in `backend/migrations/001_wimc_schema.sql` and `backend/migrations/004_bidding_system.sql`.

## Deployment

Render.com via `render.yaml` blueprint. Backend at `/backend`, Frontend at `/frontend`. Environment variables set in Render dashboard (Supabase keys, CORS origins, Resend API key).

## File Conventions

- Backend modules follow NestJS pattern: `module.ts`, `controller.ts`, `service.ts`
- Frontend pages use Next.js App Router: `app/(group)/route/page.tsx`
- Components: `components/category/component-name.tsx`
- Shared types: `shared/types.ts`, `shared/constants.ts`
- Database: `backend/migrations/NNN_description.sql`
