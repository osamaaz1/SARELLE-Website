# Performance Scan & Optimization Plan

**Scan Date**: March 2026
**Scope**: Full-stack analysis — Frontend (Next.js 14), Backend (NestJS 10), Database (Supabase/PostgreSQL), Deployment (Render.com)
**Method**: Static code analysis + architecture review against production performance patterns

---

## Executive Summary

The WIMC codebase has **critical performance anti-patterns** across every layer. The single biggest issue: **55 of 55 component files use `'use client'`**, eliminating all server-side rendering benefits of Next.js 14. Combined with zero code splitting, raw `<img>` tags (no `next/Image`), render-blocking font imports, and a 777KB unoptimized logo, the frontend will score poorly on Core Web Vitals. The backend compounds this with N+1 queries, client-side data aggregation, `select('*')` across 21 query sites, and zero caching at any layer. Deployment on Render.com free tier adds 30–60 second cold starts.

**Estimated impact of all fixes**: 60–70% reduction in page load time, 40–50% reduction in API latency, significant improvement in Lighthouse score.

---

## Severity Legend

| Level | Meaning | User Impact |
|-------|---------|-------------|
| **P0 — Critical** | Fundamentally broken performance pattern | Visible to every user on every page load |
| **P1 — High** | Major inefficiency with measurable impact | Noticeable delays or excessive resource usage |
| **P2 — Medium** | Suboptimal but functional | Affects scale or edge cases |
| **P3 — Low** | Minor optimization opportunity | Marginal improvement |

---

## Section 1: Frontend Performance

### F1. 100% Client-Side Rendering (P0 — CRITICAL)

**Finding**: Every single component and page (55/55 files) has `'use client'` at the top. This means:
- Zero server-side HTML generation — browser receives empty shell + JS bundle
- No streaming SSR, no React Server Components
- Search engines see empty pages (SEO disaster for a marketplace)
- First Contentful Paint (FCP) delayed by full JS parse + execute cycle

**Evidence**:
```
55 files with 'use client' / 55 total component files = 100%
0 files with generateStaticParams or revalidate exports
0 useQuery/useMutation calls (React Query is loaded but never used)
```

**Root Cause**: Every component was written as a client component, even those that only display data (footer, badges, cards, empty states).

**Fix — High Impact, Medium Effort**:

*Phase A — Quick wins (convert pure display components to Server Components):*
Remove `'use client'` from these files that have zero interactivity:
- `components/ui/badge.tsx` — pure display
- `components/ui/card.tsx` — pure display
- `components/ui/empty-state.tsx` — pure display
- `components/ui/loading-spinner.tsx` — pure display
- `components/ui/stat-card.tsx` — pure display
- `components/layout/footer.tsx` — pure display (links only)
- `components/marketplace/checkout-breakdown.tsx` — pure display
- `components/marketplace/order-status-timeline.tsx` — pure display

*Phase B — Data-fetching pages to Server Components:*
Convert these pages to fetch data server-side, passing to client interactive children:
- `app/(public)/browse/page.tsx` — listings are public, fetch on server
- `app/(public)/celebrities/page.tsx` — celebrities are public
- `app/(public)/listing/[id]/page.tsx` — listing detail is public
- `app/(public)/page.tsx` — homepage is public

Pattern:
```tsx
// page.tsx (Server Component — NO 'use client')
import { ListingClient } from './listing-client';

export default async function ListingPage({ params }) {
  const listing = await fetch(`${API}/listings/${params.id}`).then(r => r.json());
  return <ListingClient listing={listing} />;
}

// listing-client.tsx ('use client' — interactive parts only)
'use client';
export function ListingClient({ listing }) { /* bidding UI, etc. */ }
```

*Phase C — Static generation for stable pages:*
```tsx
// app/(public)/policies/page.tsx
export const revalidate = 86400; // revalidate once per day

// app/(public)/celebrities/page.tsx
export const revalidate = 3600; // revalidate hourly
```

**Expected Impact**: FCP improvement of 40–60%. SEO indexability. Reduced JS bundle sent to client.

---

### F2. No Image Optimization (P0 — CRITICAL)

**Finding**: 18 raw `<img>` tags across 17 files. Zero usage of `next/Image`. The `next.config.js` has `remotePatterns` configured (Supabase, Picsum, Unsplash) — proving the intent was there — but no component uses the Image component.

**Impact**:
- No automatic WebP/AVIF conversion
- No responsive `srcset` generation
- No lazy loading (all images load eagerly, even below fold)
- No image size optimization (full resolution downloaded on mobile)
- LCP (Largest Contentful Paint) severely degraded

**Fix — High Impact, Small Effort**:

Replace every `<img>` with `next/Image`. Example for `product-card.tsx`:
```tsx
// Before
<img src={image} alt={name} className="w-full h-64 object-cover" />

// After
import Image from 'next/image';
<Image src={image} alt={name} width={400} height={256} className="w-full h-64 object-cover" />
```

For dynamic URLs from Supabase Storage, the `remotePatterns` in `next.config.js` already allows them.

**Files to update** (all 17):
`navbar.tsx`, `page.tsx` (homepage), `avatar.tsx`, `image-gallery.tsx`, `product-card.tsx`, `photo-uploader.tsx` (×2), `admin/submissions/[id]/page.tsx`, `admin/submissions/page.tsx`, `seller/submissions/[id]/page.tsx`, `admin/qc/page.tsx`, `seller/submissions/page.tsx`, `offers/page.tsx`, `seller/offers/page.tsx`, `orders/page.tsx`, `checkout/[listingId]/page.tsx`, `admin/listings/page.tsx`, `orders/[id]/page.tsx`

**Expected Impact**: 50–70% reduction in image bytes. Automatic lazy loading. LCP improvement.

---

### F3. 777KB Unoptimized Logo (P1 — HIGH)

**Finding**: `frontend/public/logo.png` is **777KB** (795,648 bytes). This is the site logo loaded on every single page.

**Impact**: Adds 777KB to every page load. On 3G mobile (Egypt market), this alone takes ~3 seconds.

**Fix — High Impact, Trivial Effort**:
1. Convert to WebP: `cwebp -q 80 logo.png -o logo.webp` → expect ~50-100KB
2. Or convert to SVG if it's a simple logo → expect ~5-20KB
3. Use `next/Image` for automatic format negotiation:
```tsx
<Image src="/logo.webp" alt="WIMC" width={120} height={40} priority />
```
Note: `priority` on the logo skips lazy loading since it's above the fold.

**Expected Impact**: 85–97% reduction in logo payload.

---

### F4. Render-Blocking Font Loading (P1 — HIGH)

**Finding**: `globals.css` line 1 uses `@import url(...)` to load 3 Google Fonts (Playfair Display, DM Sans, Dancing Script). CSS `@import` is **parser-blocking** — the browser must download and parse the remote CSS before rendering any content.

**Impact**: Adds 200–500ms to First Contentful Paint (network round-trip to Google Fonts CDN + font download).

**Fix — High Impact, Small Effort**:

Replace `@import` with `next/font`:
```tsx
// app/layout.tsx
import { Playfair_Display, DM_Sans, Dancing_Script } from 'next/font/google';

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap' });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' });
const dancingScript = Dancing_Script({ subsets: ['latin'], variable: '--font-dancing', display: 'swap' });

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} ${dancingScript.variable}`}>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
```

Then remove line 1 from `globals.css` and update `tailwind.config.ts` font families to use CSS variables.

**Benefits**: Fonts are self-hosted by Next.js (no Google CDN round-trip), `font-display: swap` prevents invisible text, automatic subsetting.

**Expected Impact**: 200–500ms FCP improvement.

---

### F5. Zero Code Splitting (P1 — HIGH)

**Finding**: Zero usage of `next/dynamic` or `import()` anywhere in the codebase. Every component is statically imported, meaning the entire app's JS ships in one bundle.

**Impact**: Users loading the homepage download JS for admin panels, seller dashboards, checkout forms, image galleries — code they may never use.

**Fix — High Impact, Medium Effort**:

Lazy-load heavy/conditional components:
```tsx
import dynamic from 'next/dynamic';

// Heavy components loaded on demand
const ImageGallery = dynamic(() => import('@/components/marketplace/image-gallery'));
const OfferModal = dynamic(() => import('@/components/marketplace/offer-modal'));
const FilterPanel = dynamic(() => import('@/components/marketplace/filter-panel'));
const PhotoUploader = dynamic(() => import('@/components/ui/photo-uploader'));
const Sidebar = dynamic(() => import('@/components/layout/sidebar'));
```

**Priority targets**: Any component that is conditionally rendered (modals, admin sidebar, uploader) or only appears on specific routes.

**Expected Impact**: 30–50% reduction in initial JS bundle.

---

### F6. Unused Dependencies Shipped to Client (P1 — HIGH)

**Finding**: Three heavy packages are installed and bundled but **never used**:
- `@tanstack/react-query` (~45KB gzipped) — QueryClientProvider wraps app, but **0 useQuery/useMutation calls** exist
- `@supabase/supabase-js` (~55KB gzipped) — imported in providers but auth goes through backend API
- `@supabase/ssr` (~15KB gzipped) — imported nowhere

**Total waste**: ~115KB gzipped JavaScript shipped to every user.

**Fix — High Impact, Small Effort**:

*Option A (Recommended)*: Start using React Query for data fetching (replaces useState+useEffect pattern across all pages). This turns a liability into a performance gain via caching, deduplication, and background refetching.

*Option B*: Remove unused packages:
```bash
npm uninstall @tanstack/react-query @supabase/supabase-js @supabase/ssr
```
Then remove `QueryClientProvider` from `providers.tsx`.

**Expected Impact**: 115KB less JS if removed, or improved UX via caching if adopted.

---

### F7. Excessive Timer Instances (P2 — MEDIUM)

**Finding**: `product-card.tsx` and `listing/[id]/page.tsx` use `setInterval` for auction countdown timers. On the browse page with 20+ auction cards, this creates 20+ independent `setInterval` loops running every second.

**Impact**: Unnecessary CPU churn, potential jank on low-end mobile devices.

**Fix — Medium Impact, Small Effort**:

Create a shared countdown hook with a single timer:
```tsx
// hooks/useCountdown.ts
const listeners = new Set<() => void>();
let interval: NodeJS.Timeout | null = null;

function tick() { listeners.forEach(fn => fn()); }

export function useCountdown(endsAt: string) {
  const [remaining, setRemaining] = useState(() => calcRemaining(endsAt));
  useEffect(() => {
    const update = () => setRemaining(calcRemaining(endsAt));
    listeners.add(update);
    if (!interval) interval = setInterval(tick, 1000);
    return () => {
      listeners.delete(update);
      if (listeners.size === 0) { clearInterval(interval!); interval = null; }
    };
  }, [endsAt]);
  return remaining;
}
```

**Expected Impact**: 20 intervals → 1 interval. Reduced CPU usage on browse page.

---

### F8. AuthProvider Blocks Render Tree (P2 — MEDIUM)

**Finding**: `AuthProvider` wraps the entire app and performs an async token validation on mount. Until this completes, the component tree is blocked (or shows a loading state). Every page load — including public pages that don't need auth — waits for this.

**Fix — Medium Impact, Small Effort**:

1. For public pages (browse, listing detail, celebrities, homepage): render immediately without waiting for auth
2. Only gate auth-required routes (dashboard, seller, admin, checkout)
3. Move AuthProvider to only wrap protected route groups:
```
app/(dashboard)/layout.tsx — wrap with AuthProvider
app/(seller)/layout.tsx — wrap with AuthProvider
app/(admin)/layout.tsx — wrap with AuthProvider
app/(public)/layout.tsx — NO AuthProvider needed
```

**Expected Impact**: Public pages render 100–300ms faster (skip auth check).

---

## Section 2: Backend Performance

### B1. N+1 Query in getAdminEmails() (P0 — CRITICAL)

**Finding**: `submissions.service.ts` lines 309–322:
```typescript
const { data } = await client.from('wimc_profiles').select('id').eq('role', 'admin');
const emails: string[] = [];
for (const admin of data) {
  const email = await this.getEmailForUser(admin.id);  // DB call per admin!
  if (email) emails.push(email);
}
```
This executes 1 + N queries (1 to get admin IDs, then 1 per admin to get email). Each `getEmailForUser()` calls `client.auth.admin.getUserById()`.

**Fix — High Impact, Small Effort**:
```typescript
private async getAdminEmails(): Promise<string[]> {
  const client = this.supabase.getClient();
  const { data } = await client.from('wimc_profiles').select('id').eq('role', 'admin');
  if (!data?.length) return [];
  const emailPromises = data.map(admin => this.getEmailForUser(admin.id));
  const emails = await Promise.all(emailPromises);
  return emails.filter(Boolean) as string[];
}
```
Better yet, if Supabase admin API supports listing users by IDs in batch, use that.

**Expected Impact**: N sequential DB calls → N parallel calls. For 5 admins: ~500ms → ~100ms.

---

### B2. Client-Side Aggregation in Admin Dashboard (P0 — CRITICAL)

**Finding**: `admin.service.ts` `getDashboardStats()` fetches ALL orders and sums revenue in JavaScript:
```typescript
revenue: (orders.data || []).reduce((sum, o) => sum + (o.total || 0), 0),
```
`getPipelineOverview()` downloads ALL submissions to count by stage in JS:
```typescript
const { data } = await client.from('wimc_submissions').select('stage');
const counts = {};
(data || []).forEach(s => { counts[s.stage] = (counts[s.stage] || 0) + 1; });
```

**Impact**: As data grows, these endpoints download increasingly large payloads just to count/sum. With 10,000 orders, this downloads megabytes of data to compute a single number.

**Fix — High Impact, Small Effort**:

Use Supabase RPC to push aggregation to PostgreSQL:
```sql
-- Create as Supabase RPC function
CREATE OR REPLACE FUNCTION wimc_dashboard_stats()
RETURNS JSON AS $$
  SELECT json_build_object(
    'revenue', COALESCE(SUM(total), 0),
    'totalOrders', COUNT(*)
  ) FROM wimc_orders;
$$ LANGUAGE sql SECURITY DEFINER;
```

Or at minimum, use Supabase's count-only queries instead of downloading rows:
```typescript
const { count } = await client.from('wimc_submissions')
  .select('*', { count: 'exact', head: true })  // head: true = no data, count only
  .eq('stage', 'pending_review');
```

**Expected Impact**: Data transfer reduced from O(N rows) to O(1). Dashboard load time drops from seconds to milliseconds at scale.

---

### B3. select('*') Everywhere — Over-fetching (P1 — HIGH)

**Finding**: 21 occurrences of `select('*')` across 9 service files. This fetches every column from every table, including:
- JSONB blobs (`shipping_address`, `metadata`)
- Long text fields (`description`, `bio`)
- Audit timestamps that the frontend doesn't display

**Impact**: 2–5x more data transferred per query than needed. Compounds with B2 (aggregation on over-fetched data).

**Fix — High Impact, Medium Effort**:

Replace `select('*')` with specific columns per use case:
```typescript
// Before
.select('*')

// After — listing browse (only need card data)
.select('id, name, brand, price, category, status, photos, celebrity_id, listing_type, created_at')

// After — listing detail (need full data)
.select('id, name, brand, price, description, condition, category, status, photos, size, color, celebrity_id, listing_type, seller_id, created_at')
```

**Priority files** (sorted by query frequency):
1. `listings.service.ts` (4 occurrences) — highest traffic
2. `orders.service.ts` (4 occurrences)
3. `bids.service.ts` (4 occurrences)
4. `offers.service.ts` (2 occurrences)

**Expected Impact**: 40–60% reduction in response payload size.

---

### B4. Sequential Queries in placeBid() (P1 — HIGH)

**Finding**: `bids.service.ts` `placeBid()` executes 5 sequential queries:
1. Fetch auction → validate status
2. Fetch listing → check seller != bidder
3. Fetch current winning bid → determine proxy logic
4. Insert new bid
5. Update auction state

Query 2 is partially redundant — the auction already contains `listing_id`, and seller check could be joined.

**Fix — Medium Impact, Small Effort**:
```typescript
// Combine queries 1 and 2 into single query with join
const { data: auction } = await client
  .from('wimc_auctions')
  .select('*, wimc_listings!inner(seller_id)')
  .eq('id', auctionId)
  .single();
```
This eliminates one DB round-trip from the hot path (every bid placement).

**Expected Impact**: ~20% latency reduction on bid placement (4 queries → 3).

---

### B5. Sequential Queries in orders.create() (P1 — HIGH)

**Finding**: `orders.service.ts` `create()` executes 7–8 sequential queries:
1. Check idempotency key
2. Fetch listing
3. Validate offer/auction (conditional)
4. Calculate pricing
5. Insert order
6. Insert idempotency key
7. Update listing status to 'sold'
8. Create notification

Queries 5, 6, and 7 have no data dependency on each other — they can run in parallel.

**Fix — Medium Impact, Small Effort**:
```typescript
// After computing order data, parallelize the writes
const [orderResult, , ] = await Promise.all([
  client.from('wimc_orders').insert(orderData).select().single(),
  client.from('wimc_idempotency_keys').insert({ key, created_at: new Date() }),
  client.from('wimc_listings').update({ status: 'sold' }).eq('id', listingId),
]);
```

**Caution**: This slightly weakens atomicity. For true atomicity, use a Supabase RPC with a database transaction.

**Expected Impact**: ~30% latency reduction on order creation.

---

### B6. WebSocket Connection Overhead (P2 — MEDIUM)

**Finding**: `wimc.gateway.ts` `handleConnection()` performs 2 DB queries on every WebSocket connection:
1. `validateToken()` — Supabase auth check
2. Profile lookup — get user role for room assignment

**Impact**: Each page load that initializes Socket.io triggers these queries. If the connection drops and reconnects (common on mobile), queries repeat.

**Fix — Medium Impact, Small Effort**:
- Cache validated user data in memory (Map) with 5-minute TTL
- On reconnect, check cache before hitting DB
- Clear cache entry on disconnect

---

### B7. Email Sending Without Parallelization (P2 — MEDIUM)

**Finding**: When sending emails to multiple recipients (e.g., admin notifications), the code uses sequential `await` in loops instead of `Promise.all`.

**Fix**: Wrap email sends in `Promise.all`:
```typescript
await Promise.all(adminEmails.map(email => this.emailService.send(email, subject, body)));
```

---

### B8. No Response Caching Headers (P1 — HIGH)

**Finding**: Zero `Cache-Control`, `ETag`, or `Last-Modified` headers set on any API response. Every request for the same listing, celebrity list, or browse page hits the database fresh.

**Fix — High Impact, Medium Effort**:

Add NestJS interceptor for cache headers:
```typescript
@Injectable()
export class CacheHeadersInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const request = context.switchToHttp().getRequest();
        if (request.method === 'GET') {
          response.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
        }
      }),
    );
  }
}
```

Apply per-route with appropriate TTLs:
| Route | Cache TTL |
|-------|-----------|
| `GET /listings` (browse) | 60s |
| `GET /listings/:id` | 30s |
| `GET /celebrities` | 300s |
| `GET /bids/auction/:id` | 5s (live data) |
| Auth-required routes | `private, no-cache` |

**Expected Impact**: Eliminates redundant DB queries for repeat visitors. CDN-compatible.

---

## Section 3: Database Performance

### D1. Missing Composite Indexes (P1 — HIGH)

**Finding**: The browse query filters by `status` and sorts by `created_at`, but no composite index exists. This forces a sequential scan + sort on every browse request.

**Fix — High Impact, Small Effort**:

```sql
-- Most impactful: browse page query
CREATE INDEX idx_wimc_listings_status_created
ON wimc_listings(status, created_at DESC);

-- Celebrity listings filter
CREATE INDEX idx_wimc_listings_celebrity
ON wimc_listings(celebrity_id) WHERE celebrity_id IS NOT NULL;

-- Submissions pipeline overview
CREATE INDEX idx_wimc_submissions_stage
ON wimc_submissions(stage);

-- Orders by user
CREATE INDEX idx_wimc_orders_buyer_created
ON wimc_orders(buyer_id, created_at DESC);

-- Active auctions
CREATE INDEX idx_wimc_auctions_active_ends
ON wimc_auctions(ends_at) WHERE status = 'active';
```

**Expected Impact**: Browse queries go from sequential scan to index scan — O(N) → O(log N).

---

### D2. No Full-Text Search Index (P1 — HIGH)

**Finding**: The browse page search uses `ILIKE` on `name`, `brand`, and `description` columns. Without a GIN/GiST index, this is a full table scan on every search query.

**Fix — High Impact, Medium Effort**:

```sql
-- Add tsvector column for full-text search
ALTER TABLE wimc_listings ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(brand, '') || ' ' || coalesce(description, ''))
  ) STORED;

CREATE INDEX idx_wimc_listings_search ON wimc_listings USING gin(search_vector);
```

Then update the backend to use `@@` operator instead of `ILIKE`:
```typescript
.textSearch('search_vector', query, { type: 'websearch' })
```

**Expected Impact**: Search from O(N × row_size) → O(log N). Sub-millisecond for typical queries.

---

### D3. No Price Range Index (P2 — MEDIUM)

**Finding**: Browse page supports price filtering but no index on the `price` column.

```sql
CREATE INDEX idx_wimc_listings_price ON wimc_listings(price) WHERE status = 'published';
```

---

## Section 4: Deployment & Infrastructure

### I1. Render.com Free Tier Cold Starts (P0 — CRITICAL)

**Finding**: Both services use `plan: free` in `render.yaml`. Render free tier spins down after 15 minutes of inactivity, causing **30–60 second cold starts** on next request.

**Impact**: First visitor after inactivity waits up to a minute. For a marketplace in Egypt (not 24/7 traffic), this happens frequently.

**Fix — Critical Impact, Requires Budget**:

*Option A (Recommended)*: Upgrade to Starter plan ($7/month per service = $14/month total). No cold starts.

*Option B (Free workaround)*: Add a health check endpoint and use an external cron (e.g., cron-job.org) to ping every 14 minutes:
```yaml
# render.yaml addition
healthCheckPath: /api/health
```
```typescript
// backend health endpoint
@Get('health')
healthCheck() { return { status: 'ok', timestamp: Date.now() }; }
```

---

### I2. No CDN for Static Assets (P1 — HIGH)

**Finding**: No CDN configured. All static assets (JS bundles, CSS, images) served directly from Render.com origin servers.

**Impact**: Users in Egypt/Middle East get high latency to Render's US/EU servers for every asset request.

**Fix — High Impact, Small Effort**:
- Enable Render's built-in CDN (available on paid plans)
- Or add Cloudflare free tier in front of the domain
- Configure `next.config.js` asset prefix if using external CDN

---

### I3. No Health Checks in render.yaml (P2 — MEDIUM)

**Finding**: No `healthCheckPath` defined. Render can't distinguish between a crashed service and a healthy one, leading to delayed restarts.

**Fix**: Add to both services in `render.yaml`:
```yaml
healthCheckPath: /api/health  # backend
healthCheckPath: /            # frontend
```

---

## Section 5: Asset Optimization

### A1. No Favicon or Manifest (P2 — MEDIUM)

**Finding**: `public/` directory contains only `logo.png`. No `favicon.ico`, no `manifest.json`, no `apple-touch-icon.png`. Every page load generates 404s for these standard files.

**Fix**: Generate and add:
- `favicon.ico` (16×16, 32×32)
- `favicon-16x16.png`, `favicon-32x32.png`
- `apple-touch-icon.png` (180×180)
- `manifest.json` with app name, theme color, icons

---

## Prioritized Implementation Roadmap

### Sprint 1: Quick Wins (1–2 days, highest ROI)

| # | Fix | Severity | Effort | Expected Impact |
|---|-----|----------|--------|----------------|
| 1 | F3: Compress logo.png (777KB → ~50KB) | P1 | 30min | -727KB per page |
| 2 | F4: Replace @import fonts with next/font | P1 | 1hr | -200–500ms FCP |
| 3 | I1: Add health check + keep-alive ping | P0 | 30min | Eliminate cold starts |
| 4 | B1: Fix N+1 in getAdminEmails() | P0 | 15min | -400ms on email sends |
| 5 | A1: Add favicon + manifest | P2 | 30min | Eliminate 404s |
| 6 | I3: Add healthCheckPath to render.yaml | P2 | 5min | Faster crash recovery |

### Sprint 2: Image & SSR Foundation (2–3 days)

| # | Fix | Severity | Effort | Expected Impact |
|---|-----|----------|--------|----------------|
| 7 | F2: Replace all `<img>` with next/Image (17 files) | P0 | 3hrs | -50–70% image bytes |
| 8 | F1-A: Convert ~8 pure display components to Server Components | P0 | 2hrs | Reduced JS bundle |
| 9 | F1-B: Convert public pages to server-side data fetching | P0 | 4hrs | -40–60% FCP |
| 10 | B8: Add Cache-Control headers interceptor | P1 | 2hrs | Reduced DB queries |

### Sprint 3: Backend Optimization (1–2 days)

| # | Fix | Severity | Effort | Expected Impact |
|---|-----|----------|--------|----------------|
| 11 | B2: Move admin dashboard aggregation to SQL | P0 | 2hrs | Dashboard: seconds → ms |
| 12 | B3: Replace select('*') with specific columns (9 files, 21 sites) | P1 | 3hrs | -40–60% response size |
| 13 | B4: Combine queries in placeBid() | P1 | 1hr | -20% bid latency |
| 14 | B5: Parallelize writes in orders.create() | P1 | 1hr | -30% order latency |
| 15 | D1: Add composite database indexes | P1 | 1hr | Browse: O(N) → O(log N) |

### Sprint 4: Advanced Optimization (2–3 days)

| # | Fix | Severity | Effort | Expected Impact |
|---|-----|----------|--------|----------------|
| 16 | F5: Add dynamic imports for heavy components | P1 | 2hrs | -30–50% initial JS |
| 17 | F6: Adopt React Query or remove unused deps | P1 | 4hrs | Client-side caching |
| 18 | D2: Add full-text search index | P1 | 2hrs | Search: instant |
| 19 | F7: Shared countdown timer | P2 | 1hr | Reduced CPU on browse |
| 20 | F8: Move AuthProvider out of public routes | P2 | 2hrs | -100–300ms public pages |

### Sprint 5: Infrastructure (budget dependent)

| # | Fix | Severity | Effort | Expected Impact |
|---|-----|----------|--------|----------------|
| 21 | I1: Upgrade Render to Starter plan | P0 | 10min | Zero cold starts |
| 22 | I2: Add Cloudflare CDN | P1 | 1hr | -50–200ms global latency |
| 23 | B6: Cache WebSocket auth | P2 | 1hr | Reduced reconnect cost |

---

## Performance Rules for Future Development

These rules should be followed for all new code to prevent performance regressions:

### Frontend Rules

1. **Default to Server Components.** Only add `'use client'` when the component uses hooks, event handlers, or browser APIs. If a page fetches data and displays it, it should be a Server Component.

2. **Always use `next/Image`** for images. Never use raw `<img>`. Configure `sizes` prop for responsive loading.

3. **Lazy-load below-fold and conditional components** with `next/dynamic`. Modals, drawers, and admin-only components should never be in the initial bundle.

4. **Use `next/font` for all fonts.** Never use CSS `@import` or `<link>` for font loading.

5. **Set `revalidate` on stable pages.** Celebrity pages, policies, and homepage should use ISR with appropriate TTLs.

6. **Use React Query for data fetching** if the package stays installed. Set appropriate `staleTime` (5min for browse, 30s for auctions, 1hr for celebrities).

### Backend Rules

7. **Never use `select('*')`.** Always specify exact columns needed for the use case.

8. **Push aggregation to the database.** Never download rows to count/sum in JavaScript. Use SQL `COUNT()`, `SUM()`, or Supabase RPC functions.

9. **Parallelize independent queries** with `Promise.all`. Never `await` queries sequentially if they don't depend on each other's results.

10. **Set Cache-Control headers** on all GET endpoints. Use `public` for public data, `private` for user-specific data.

11. **Add database indexes** for any new column used in `WHERE`, `ORDER BY`, or `JOIN` clauses. Create them in the same migration as the table.

12. **Avoid N+1 patterns.** When loading related data, use joins (`select('*, related_table(*)')`) instead of loops with individual queries.

### Asset Rules

13. **Compress all images** before adding to `public/`. Target < 100KB for logos, < 500KB for hero images. Prefer WebP or SVG.

14. **Optimize public/ directory.** Include favicon, manifest.json, and apple-touch-icon. These are requested on every page load.

### Deployment Rules

15. **Never deploy on free tier for production.** Cold starts are unacceptable for a marketplace. Budget for at minimum Starter plan.

16. **Always set `healthCheckPath`** in render.yaml for crash detection and zero-downtime deploys.

---

## Metrics to Track Post-Implementation

| Metric | Tool | Target |
|--------|------|--------|
| Largest Contentful Paint (LCP) | Lighthouse | < 2.5s |
| First Contentful Paint (FCP) | Lighthouse | < 1.8s |
| Total Blocking Time (TBT) | Lighthouse | < 200ms |
| Cumulative Layout Shift (CLS) | Lighthouse | < 0.1 |
| Time to First Byte (TTFB) | WebPageTest | < 800ms |
| JS Bundle Size | `next build` output | < 200KB first load |
| API P95 Latency | Backend logging | < 500ms |
| Lighthouse Performance Score | Lighthouse | > 80 |
