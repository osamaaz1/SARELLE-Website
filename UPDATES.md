# WIMC — Update Log

## v1.3.0 — Supabase Storage Integration (2026-03-10)

### Overview
Full file upload support via Supabase Storage. Photos are now uploaded as real files (not base64 data URLs) to two public buckets: `wimc-listings` (submission + listing photos) and `wimc-avatars` (user + celebrity avatars).

### Backend

**New module: `StorageModule`** (`backend/src/storage/`)
- `StorageService` — upload, delete, validate files via Supabase admin client
  - UUID-based filenames, MIME type validation (jpeg/png/webp/heic), size limits
- `StorageController` — 4 authenticated upload endpoints:

| Endpoint | Method | Role | Bucket | Max Files | Max Size |
|----------|--------|------|--------|-----------|----------|
| `/api/storage/submission-photos/:submissionId` | POST | seller, vip_seller | wimc-listings | 8 | 5MB |
| `/api/storage/listing-photos/:submissionId` | POST | admin | wimc-listings | 12 | 5MB |
| `/api/storage/avatar` | POST | any auth | wimc-avatars | 1 | 2MB |
| `/api/storage/celebrity-avatar/:celebrityId` | POST | admin | wimc-avatars | 1 | 2MB |

**Migration** (`backend/migrations/005_storage_buckets.sql`)
- Creates `wimc-listings` and `wimc-avatars` buckets with file size limits and allowed MIME types
- RLS policies: public read, authenticated write to own folders

### Frontend

**`PhotoUploader` component rewritten** (`frontend/src/components/ui/photo-uploader.tsx`)
- Now works with `File` objects instead of base64 data URLs
- Previews via `URL.createObjectURL()` (no memory-heavy base64 strings)
- Client-side validation: file type + size (5MB)
- Upload spinner overlay when `uploading=true`
- Support for `existingUrls` (admin can see already-uploaded photos)

**Seller submit page** (`frontend/src/app/(seller)/seller/submit/page.tsx`)
- New flow: select files → upload to Supabase Storage → create submission with URLs
- Shows "Uploading photos..." button state during upload

**Admin listings page** (`frontend/src/app/(admin)/admin/listings/page.tsx`)
- Publish modal now includes `PhotoUploader` for pro photography uploads
- Can add new photos alongside existing submission photos
- Uploads pro photos before creating listing

**API client** (`frontend/src/lib/api.ts`)
- 4 new upload methods: `uploadSubmissionPhotos`, `uploadListingPhotos`, `uploadAvatar`, `uploadCelebrityAvatar`
- Each has mock mode fallback using `URL.createObjectURL()`
- Uses `FormData` (auto-detected by existing `request()` method)

### Files

**New (4):**
1. `backend/src/storage/storage.service.ts`
2. `backend/src/storage/storage.controller.ts`
3. `backend/src/storage/storage.module.ts`
4. `backend/migrations/005_storage_buckets.sql`

**Modified (5):**
1. `backend/src/app.module.ts` — Added StorageModule import
2. `frontend/src/lib/api.ts` — 4 upload methods
3. `frontend/src/components/ui/photo-uploader.tsx` — Rewrite: base64 → File objects
4. `frontend/src/app/(seller)/seller/submit/page.tsx` — New upload flow
5. `frontend/src/app/(admin)/admin/listings/page.tsx` — Pro photo upload in publish modal

### Build Status
- Backend: **PASS** (zero errors)
- Frontend types: **PASS** (zero errors)

---

## v1.2.0 — Backend Bug Fixes & Security Hardening (2026-03-10)

### CRITICAL Fixes

| # | Bug | File(s) | Fix |
|---|-----|---------|-----|
| 1 | Admin submissions endpoint broken — `listBySeller('*')` always returns empty | `admin.controller.ts`, `submissions.service.ts` | Removed bogus `require()`. Added `listAll(stage?)` method that queries without seller_id filter. |
| 2 | Admin review has no stage validation — can re-process already-approved submissions | `submissions.service.ts` | Added `stage !== 'pending_review'` guard before approve/reject. |
| 3 | Order double-buy race condition — two buyers can purchase same listing | `orders.service.ts` | Atomic conditional update: `.update({status:'sold'}).in('status', ['published','reserved'])` — if 0 rows returned, listing already claimed. |
| 4 | Offer accept race condition — two concurrent accepts both succeed | `offers.service.ts` | Atomic conditional update: `.update({status:'accepted'}).eq('status','pending')` — check returned data. |
| 5 | Idempotency key stored AFTER mutations — crash causes duplicate orders/offers | `orders.service.ts`, `offers.service.ts` | Store idempotency key FIRST with `pending` status, perform mutations, then update with response. |
| 6 | Order status transitions unvalidated — admin can set any status including nonsense | `orders.service.ts` | Added `VALID_ORDER_TRANSITIONS` map. Validates current→new transition before applying. |
| 7 | Rate limiting completely non-functional — ThrottlerGuard never registered | `app.module.ts`, `auth.controller.ts` | Added `{ provide: APP_GUARD, useClass: ThrottlerGuard }`. Login: 5/15min, Register: 3/15min. |
| 8 | Weak password validation — `123456` accepted | `auth.dto.ts` | `@MinLength(8)` + `@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)` |

### HIGH — Data Integrity

| # | Bug | File(s) | Fix |
|---|-----|---------|-----|
| 9 | Payout commission silently defaults to highest rate (20%) when profile missing | `payouts.service.ts` | Throw `NotFoundException` if seller profile not found instead of defaulting. |
| 10 | Payout trigger race condition — concurrent clicks create duplicate payouts | `payouts.service.ts` | Changed `.insert()` to `.upsert()` with `onConflict: 'order_id'`. |
| 11 | No limit cap on browse query — `?limit=999999` returns entire DB | `listings.controller.ts` | Clamped: `Math.min(Math.max(Number(limit)\|\|20, 1), 100)`. Also sanitized page/price params. |
| 12 | Shipping address accepts any shape (`Record<string, any>`) | `orders.service.ts` | Changed type to `{ street: string; city: string; zip: string; country: string }`. |
| 13 | Raw Supabase error thrown to client — leaks table/column names | `admin.service.ts` | Replaced `throw error` with `throw new BadRequestException('Failed to create celebrity')`. |
| 14 | Notification create silently fails — error not checked | `notifications.service.ts` | Destructure error, log with `this.logger.error()`. |
| 15 | N+1 query in getCelebrityListings — 1 query per celebrity | `listings.service.ts` | Single `.in('celebrity_id', ids)` query, group results in JS. |

### MEDIUM — Security & Edge Cases

| # | Bug | File(s) | Fix |
|---|-----|---------|-----|
| 16 | No WebSocket connection limit — memory exhaustion DoS | `wimc.gateway.ts` | Cap at 5 connections per user; disconnect excess. |
| 17 | toggleSave race condition — duplicate inserts | `listings.service.ts` | Wrapped insert in try/catch for unique constraint errors. |
| 18 | Missing env var validation — broken Supabase client on missing vars | `supabase.service.ts` | Explicit check: throw `Error('Missing required Supabase env vars')` if any missing. |
| 19 | NaN risk in PAYOUT_DELAY_DAYS — non-numeric env var breaks date calc | `orders.service.ts` | Added `\|\| 3` fallback after `parseInt()`. |
| 20 | addEvent silently swallows errors — no audit trail on failure | `submissions.service.ts` | Destructure error, log with `this.logger.error()`. |
| 21 | console.log instead of NestJS Logger in main.ts | `main.ts` | Replaced with `Logger.log()` from `@nestjs/common`. |

### Files Modified (15)

1. `src/admin/admin.controller.ts` — Bug 1
2. `src/submissions/submissions.service.ts` — Bugs 1, 2, 20
3. `src/orders/orders.service.ts` — Bugs 3, 5, 6, 12, 19
4. `src/offers/offers.service.ts` — Bugs 4, 5
5. `src/payouts/payouts.service.ts` — Bugs 9, 10
6. `src/listings/listings.service.ts` — Bugs 15, 17
7. `src/listings/listings.controller.ts` — Bug 11
8. `src/auth/auth.controller.ts` — Bug 7
9. `src/auth/dto/auth.dto.ts` — Bug 8
10. `src/app.module.ts` — Bug 7
11. `src/admin/admin.service.ts` — Bug 13
12. `src/notifications/notifications.service.ts` — Bug 14
13. `src/gateway/wimc.gateway.ts` — Bug 16
14. `src/supabase/supabase.service.ts` — Bug 18
15. `src/main.ts` — Bug 21

---

## v1.1.0 — Infrastructure & Real-Time (2026-03-10)

### Database & Seed Data
- **Schema**: 15 tables with RLS policies, indexes, triggers, and enums (`backend/migrations/001_wimc_schema.sql`)
- **Seed data** fully rewritten (`backend/migrations/002_seed_test_data.sql`):
  - 6 test users: admin, 2 sellers, 2 buyers, 1 VIP celebrity
  - 4 celebrities: Yasmine Sabri, Mohamed Ramadan, Hend Sabry, Amr Diab
  - 10 luxury listings with real Unsplash images (Hermès, Chanel, LV, Rolex, Louboutin, Gucci, Cartier, Dior, Valentino, Prada)
  - 5 submissions across different workflow stages (pending_review, pickup_scheduled, arrived_at_office, auth_passed)
  - 2 pending offers
  - 2 orders (paid + shipped) with full audit trails
  - Sample notifications
- Removed redundant `003_test_users.sql`

### Email Notifications (Resend)
- **New**: `backend/src/email/email.service.ts` — Central email service using Resend API (free tier: 3,000 emails/month)
- **New**: `backend/src/email/email.module.ts` — Global NestJS module
- **New**: `backend/src/email/templates.ts` — Dark-themed HTML email templates matching WIMC branding (#0A0A0A bg, #FF4444 accent)
- Graceful fallback: logs emails to console if `RESEND_API_KEY` is not set
- Fire-and-forget pattern: emails never block the main request

#### Email triggers wired:
| Service | Event | Recipient |
|---------|-------|-----------|
| Submissions | Submission created | Seller |
| Submissions | Price suggested by admin | Seller |
| Submissions | Price accepted/rejected by seller | Admin(s) |
| Submissions | Authentication failed | Seller |
| Offers | New offer placed | Seller |
| Offers | Offer accepted/rejected | Buyer |
| Orders | Order confirmed | Buyer + Seller |
| Orders | Order shipped/delivered | Buyer |

### WebSocket Real-Time Events
- **Gateway** (`wimc.gateway.ts`) now wired to all core services
- **Notifications service** emits `notification` event on every new notification (powers real-time bell icon)
- **4 modules** updated to import `GatewayModule`: Submissions, Offers, Orders, Notifications

#### WebSocket events emitted:
| Event | Emitted When | Recipients |
|-------|-------------|------------|
| `submission:new` | Seller submits item | Admin room |
| `submission:stage-changed` | Any stage transition | Seller + Admin |
| `offer:new` | Buyer places offer | Seller |
| `offer:updated` | Offer accepted/rejected | Buyer |
| `order:new` | Order created | Seller + Admin |
| `order:status-changed` | Status updated (shipped/delivered) | Buyer + Seller |
| `notification` | Any notification created | Target user |

### Frontend Socket Provider
- **New**: `frontend/src/providers/socket-provider.tsx`
  - Auto-connects WebSocket when user logs in
  - Disconnects on logout
  - Tracks `unreadCount` for notification badges
  - Exposes `useSocket()` hook with `on`/`off` for components to subscribe to events
  - Reconnection with exponential backoff (up to 10 attempts)
- Integrated into provider chain in `providers.tsx`

### Branding
- Verified: zero "Sarelle" references in frontend and backend source code
- All branding correctly shows "WIMC" / "WHATINMYCLOSET" / "by Dina Bahgat"

### Deploy Config
- `backend/src/app.module.ts` — Added `EmailModule` to imports
- `render.yaml` — Added `RESEND_API_KEY` (sync: false) and `EMAIL_FROM` env vars

### Files Changed

**New files (6):**
- `backend/src/email/email.service.ts`
- `backend/src/email/email.module.ts`
- `backend/src/email/templates.ts`
- `frontend/src/providers/socket-provider.tsx`

**Modified files (13):**
- `backend/migrations/002_seed_test_data.sql` — Complete rewrite with comprehensive data
- `backend/src/app.module.ts` — Added EmailModule
- `backend/src/submissions/submissions.module.ts` — Added GatewayModule import
- `backend/src/submissions/submissions.service.ts` — Added EmailService + WimcGateway
- `backend/src/offers/offers.module.ts` — Added GatewayModule import
- `backend/src/offers/offers.service.ts` — Added EmailService + WimcGateway
- `backend/src/orders/orders.module.ts` — Added GatewayModule import
- `backend/src/orders/orders.service.ts` — Added EmailService + WimcGateway
- `backend/src/notifications/notifications.module.ts` — Added GatewayModule import
- `backend/src/notifications/notifications.service.ts` — Added WimcGateway
- `frontend/src/providers/providers.tsx` — Added SocketProvider
- `render.yaml` — Added RESEND_API_KEY + EMAIL_FROM

**Deleted files (1):**
- `backend/migrations/003_test_users.sql` — Merged into 002

### New Environment Variables

```env
# Backend (.env)
RESEND_API_KEY=re_xxxxxxxxxxxx        # From dashboard.resend.com
EMAIL_FROM=WIMC <noreply@whatinmycloset.com>  # After domain verification in Resend
# Temporary (no domain): WIMC <onboarding@resend.dev>
```

### Test Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@whatinmycloset.com | Admin123! | admin |
| sara@test.wimc.com | Seller123! | seller |
| nadia@test.wimc.com | Seller123! | seller |
| reem@test.wimc.com | Buyer123! | buyer |
| yasmine@test.wimc.com | Celeb123! | vip_seller |
| buyer@test.wimc.com | Buyer123! | buyer |

### Build Status
- Backend: **PASS** (zero errors)
- Frontend: **PASS** (zero errors, warnings only — `<img>` vs `<Image>`, missing useEffect deps)

---

## v1.0.0 — Initial Release

- Next.js 14 frontend with App Router, Tailwind CSS, dark luxury theme
- NestJS 10 backend with Supabase (PostgreSQL + Auth)
- Full submission workflow (9 stages with audit trail)
- Listings browse with search, filters, sorting, pagination
- Offer system (create, accept, reject, withdraw)
- Order system with status tracking
- Admin panel with 20+ endpoints
- WebSocket gateway infrastructure (connection + rooms)
- Mock mode for development without backend
- Render.com deployment blueprint

### Monthly Cost Estimate
| Scenario | Cost |
|----------|------|
| Minimum (backend sleeps) | ~$26/mo ($25 Supabase Pro + $1 Domain) |
| Recommended (always-on) | ~$33/mo (+$7 Render Starter) |
