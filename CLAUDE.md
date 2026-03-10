# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**WHATINMYCLOSET (WIMC)** — domain: **WHATINMYCLOSET.com** — is a luxury pre-loved items resale marketplace. Sellers submit items (bags, shoes, watches, jewellery, clothing), which go through admin review, pickup, authentication, professional photography, and listing. Buyers browse, bid (auctions), make offers, or buy now. Celebrity closets are a premium feature. The platform operates in Egypt/Middle East (Egyptian phone numbers, Cairo addresses).

**CRITICAL BRANDING ISSUE:** The codebase inconsistently uses **"Sarelle"** as the brand name in many places (metadata, navbar logo text, footer, hero fallback text, login page). The correct name is **WIMC / WHATINMYCLOSET**. All references to "Sarelle" must be replaced with "WIMC" or "WHATINMYCLOSET" as appropriate. The tagline is "by Dina Bahgat".

## Architecture

**Monorepo** with three separate applications:

```
frontend/    → Next.js 14 (App Router) + Tailwind CSS + TypeScript
backend/     → NestJS 10 + Supabase (PostgreSQL + Auth) + TypeScript
shared/      → Shared TypeScript types and constants (not an npm package, just files)
wimc/        → Legacy standalone React+Vite prototype (single-file App.jsx with inline styles)
```

The `wimc/` directory is a **separate legacy Vite app** that served as the original prototype (website.txt = marketplace, admin.txt = admin panel). It uses `window.storage` API and is NOT connected to the actual backend. It should be treated as reference only.

### Frontend (Next.js 14)

- **Route groups:** `(public)` = homepage/browse/listing/celebrities, `(dashboard)` = buyer account/orders/checkout, `(seller)` = seller dashboard/submissions, `(admin)` = admin panel
- **Auth:** Custom JWT-based via `AuthProvider` context + middleware token check. Tokens stored in `localStorage` (`wimc_token`) and duplicated to cookies for middleware.
- **API client:** Singleton `api` object in `lib/api.ts` — supports `USE_MOCK=true` mode with hardcoded mock data for development without backend
- **Styling:** Tailwind with custom `wimc-*` color tokens defined in `tailwind.config.ts`. Dark theme (#0A0A0A background). Fonts: Playfair Display (headings), DM Sans (body), Dancing Script (accent).
- **State:** React Query (`@tanstack/react-query`) available but most pages use local `useState` + `useEffect` fetching pattern
- **Real-time:** Socket.io client available but not actively wired to components
- **Icons:** lucide-react

### Backend (NestJS 10)

- **Database:** Supabase (PostgreSQL + Auth). Tables prefixed `wimc_` (wimc_profiles, wimc_listings, wimc_submissions, etc.)
- **Auth flow:** Register creates Supabase auth user + inserts `wimc_profiles` row. Login uses Supabase anon client for `signInWithPassword`. JWT validated via `supabase.auth.getUser(token)`.
- **Modules:** Auth, Users, Submissions, Listings, Offers, Orders, Payouts, Notifications, Admin, Gateway (WebSocket)
- **Global:** `api` prefix on all routes, ValidationPipe with whitelist+transform, Helmet, CORS, ThrottlerModule (60 req/min)
- **Supabase service:** Two clients — admin (service role key, bypasses RLS) and anon (for auth operations)

### Submission Workflow (Core Business Logic)

`pending_review` → `price_suggested` → `price_accepted` → `pickup_scheduled` → `driver_dispatched` → `arrived_at_office` → `auth_passed`/`auth_failed` → `photoshoot_done` → `listed`

Each transition is guarded by stage validation and creates a `wimc_submission_events` audit trail entry.

## Development Commands

### Frontend
```bash
cd frontend
npm install
npm run dev          # Next.js dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint
```

### Backend
```bash
cd backend
npm install
npm run dev          # NestJS watch mode (port 4000)
npm run build        # Compile to dist/
npm run start:prod   # Run compiled (node dist/main)
npm run lint         # ESLint on src/ and test/
```

### Environment Variables

**Backend** (`.env`):
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`
- `CORS_ORIGIN` (comma-separated frontend URLs)
- Commission rates: `COMMISSION_BRONZE=20`, `COMMISSION_SILVER=18`, `COMMISSION_GOLD=15`, `COMMISSION_PLATINUM=12`

**Frontend** (`.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL` (backend URL, default `http://localhost:4000`)
- `NEXT_PUBLIC_WS_URL` (WebSocket URL, same as API URL)
- `NEXT_PUBLIC_USE_MOCK=true` enables mock data mode (no backend needed)

### Deployment
Configured for **Render.com** via `render.yaml` blueprint. Backend rootDir=`backend/`, Frontend rootDir=`frontend/`.

## Database Schema (Supabase Tables)

All tables prefixed `wimc_`: `wimc_profiles`, `wimc_seller_profiles`, `wimc_vip_profiles`, `wimc_submissions`, `wimc_submission_events`, `wimc_celebrities`, `wimc_listings`, `wimc_saved_items`, `wimc_offers`, `wimc_orders`, `wimc_order_events`, `wimc_payouts`, `wimc_notifications`

Roles: `buyer`, `seller`, `vip_seller`, `admin`

Seller tiers: Bronze (0pts, 20% commission), Silver (500pts, 18%), Gold (1500pts, 15%), Platinum (5000pts, 12%)

## Known Issues & Incomplete Features

### CRITICAL — Branding
- **Wrong brand name everywhere**: `frontend/src/app/layout.tsx` metadata says "Sarelle", navbar displays "SARELLE", footer says "Sarelle", login page says "Sarelle account", hero fallback says "SARELLE". Must all be "WIMC" / "WHATINMYCLOSET".

### Frontend — UI/UX Problems
- **No product images in production**: Product cards show "WIMC" placeholder text because listings from the database have no actual photo URLs. The mock data uses `picsum.photos` placeholders. Real photo upload/storage (Supabase Storage) is not implemented.
- **Bidding system is fake**: The bid handler in `listing/[id]/page.tsx` has a comment `// In real app: await api.placeBid(...)` — it just shows a toast, no API call. There is no `placeBid` method on the API client, no backend endpoint for bids, no bids table.
- **No payment integration**: Checkout page collects shipping address and creates an order, but there's no actual payment gateway (Stripe, etc.). Orders go straight to `pending_payment` status.
- **Saved items broken in mock mode**: `toggleSave` calls the API which fails in mock mode (no mock implementation). The save/heart button on product cards hits the real API.
- **Celebrity closet links don't work properly**: Home page celebrity cards all link to `/celebrities` page instead of individual celebrity closet pages. The `/closet/[sellerId]` route exists but isn't used from the celebrities list.
- **No image upload for submissions**: The seller submit page (`seller/submit`) has no photo upload UI — the `createSubmission` API sends photo data but there's no Supabase Storage integration to actually upload files.
- **Missing mobile bottom navigation**: The app uses a top navbar with hamburger menu on mobile, but luxury marketplace apps typically need a fixed bottom tab bar for mobile UX.
- **No splash/loading screen**: The Next.js app has no branded splash screen on initial load (the legacy `wimc/` Vite app had one).
- **Footer links all point to `/policies`**: Every footer link under "Sell" and "Support" goes to the same `/policies` page.
- **Register page has no role selection UI**: The register endpoint expects a role but the register form doesn't let users choose buyer vs seller.
- **No notification UI**: Backend has full notification system but frontend has no notification bell, dropdown, or notifications page.
- **Order detail page missing real-time tracking**: The order detail page exists but has no live status tracking or timeline visualization.
- **Dashboard pages are basic**: `/dashboard` and seller dashboard pages exist but are minimal, lacking analytics, charts, or comprehensive seller tools.

### Backend — Incomplete / Missing
- **No file upload endpoint**: No Multer integration or Supabase Storage helpers for photo uploads despite `multer` not being in dependencies.
- **No bidding system**: No bids table, no bid endpoints, no bid logic — despite the frontend showing auction UI.
- **No payment processing**: Orders are created but no payment capture/verification.
- **No email notifications**: Notifications are DB-only, no email/SMS sending.
- **WebSocket gateway is minimal**: `wimc.gateway.ts` exists but likely just handles connection — no real-time listing updates, bid updates, or chat.
- **No rate limiting on auth endpoints**: ThrottlerModule is global but auth endpoints (login/register) should have stricter limits.
- **Missing database migrations folder**: No SQL migration files in the repo — database schema must be created manually in Supabase dashboard.

### Mobile UX Issues
- **Touch targets too small**: Many buttons and links use 11-13px font sizes without adequate padding for mobile touch.
- **No pull-to-refresh**: Standard mobile UX pattern missing.
- **Search bar not mobile-optimized**: Search on the browse page doesn't have a full-screen mobile search experience.
- **Product card grid too dense**: 2-column grid on mobile with small text can be hard to read.
- **No swipe gestures**: Image gallery on listing detail has no swipe support for mobile.
- **Horizontal scrolling on celebrity cards**: On small screens, the 2-column grid can be tight; a horizontal scroll carousel would be better.
- **Checkout form not mobile-friendly**: Address fields are small and cramped on mobile screens.
