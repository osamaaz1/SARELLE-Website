# Implementation Roadmap

## Phase 0: Foundation Fixes (Current Sprint)
**Goal**: Fix critical issues that block basic functionality.

| # | Task | Priority | Effort | Status |
|---|------|----------|--------|--------|
| 0.1 | Fix branding: replace all "Sarelle" with "WIMC" | Critical | Small | Partially done (navbar/footer fixed) |
| 0.2 | Fix footer links (each link to correct page or anchor) | High | Small | Pending |
| 0.3 | Fix celebrity closet links (link to `/closet/[sellerId]`) | High | Small | Pending |
| 0.4 | Fix saved items in mock mode | Medium | Small | Pending |
| ~~0.5~~ | ~~Add role selection to register page~~ | ~~High~~ | ~~Small~~ | **Done** (buyer/seller dropdown exists) |
| 0.6 | Fix currency display: replace all `$` with `EGP` | High | Small | Pending |

---

## Phase 1: Photo Upload Frontend Integration
**Goal**: Wire existing backend storage to frontend UI for real product images.

**Note**: Backend `StorageModule` already exists with full Multer integration, 4 upload endpoints, MIME validation, and Supabase Storage. Migration `005_storage_buckets.sql` creates the storage buckets. Only frontend wiring remains.

| # | Task | Priority | Effort | Status |
|---|------|----------|--------|--------|
| ~~1.1~~ | ~~Configure Multer in NestJS~~ | ~~Critical~~ | ~~Medium~~ | **Done** (StorageModule) |
| ~~1.2~~ | ~~Implement Supabase Storage helpers~~ | ~~Critical~~ | ~~Medium~~ | **Done** (StorageService) |
| ~~1.3~~ | ~~Wire submission photo upload endpoint~~ | ~~Critical~~ | ~~Medium~~ | **Done** (`POST /storage/submission-photos/:id`) |
| ~~1.4~~ | ~~Wire listing photo upload endpoint~~ | ~~Critical~~ | ~~Medium~~ | **Done** (`POST /storage/listing-photos/:id`) |
| ~~1.5~~ | ~~Wire avatar upload endpoint~~ | ~~Medium~~ | ~~Small~~ | **Done** (`POST /storage/avatar`) |
| 1.6 | Wire PhotoUploader in seller submit form to call `api.uploadSubmissionPhotos()` | Critical | Medium | Pending |
| 1.7 | Display real Supabase Storage photos in ProductCard and listing detail | Critical | Small | Pending |

---

## Phase 2: Notification UI
**Goal**: Surface backend notifications to users.

| # | Task | Priority | Effort | Dependencies |
|---|------|----------|--------|-------------|
| 2.1 | Add notification bell icon to navbar | High | Small | None |
| 2.2 | Build notification dropdown (recent 5 + "View All" link) | High | Medium | 2.1 |
| 2.3 | Build `/notifications` page (paginated list) | High | Medium | 2.1 |
| 2.4 | Wire WebSocket for real-time notification updates | High | Medium | 2.3 |
| 2.5 | Add unread badge count to bell icon | Medium | Small | 2.1 |

---

## Phase 3: Payment Integration
**Goal**: Enable real money transactions.

| # | Task | Priority | Effort | Dependencies |
|---|------|----------|--------|-------------|
| 3.1 | Choose payment provider (Paymob recommended for Egypt) | Critical | Small | None |
| 3.2 | Implement payment intent creation (backend) | Critical | Large | 3.1 |
| 3.3 | Build payment UI in checkout page | Critical | Large | 3.2 |
| 3.4 | Handle payment webhooks (confirm/fail) | Critical | Large | 3.2 |
| 3.5 | Update order status flow (pending_payment → paid) | Critical | Medium | 3.4 |
| 3.6 | Implement refund flow | High | Medium | 3.2 |

---

## Phase 4: Auction Automation
**Goal**: Auctions end automatically without admin intervention.

| # | Task | Priority | Effort | Dependencies |
|---|------|----------|--------|-------------|
| 4.1 | Add cron job / scheduled task for auction expiry check | Critical | Medium | None |
| 4.2 | Auto-call `endAuction()` when `ends_at` passes | Critical | Small | 4.1 |
| 4.3 | Send winner notification with checkout deadline (48h) | High | Small | 4.2 |
| 4.4 | Auto-expire winner checkout after 48h (re-list if unpaid) | Medium | Medium | 4.2 |

---

## Phase 5: Email Coverage Expansion
**Goal**: Ensure all critical user journeys have email notifications.

**Note**: Email is already configured via **Resend** (`EmailModule` + `EmailService` + `templates.ts`). Dark-themed HTML templates exist. Emails are sent for: submission received, price suggested, price response, auth failed, new offer, offer response, order confirmation (buyer+seller), shipping updates. Falls back to console logging if `RESEND_API_KEY` not set.

| # | Task | Priority | Effort | Status |
|---|------|----------|--------|--------|
| ~~5.1~~ | ~~Configure email provider~~ | ~~High~~ | ~~Medium~~ | **Done** (Resend) |
| ~~5.2~~ | ~~Create email templates~~ | ~~High~~ | ~~Medium~~ | **Done** (9 templates in `templates.ts`) |
| 5.3 | Send registration welcome email | Medium | Small | Pending (not yet triggered) |
| ~~5.4~~ | ~~Send price suggestion email~~ | ~~High~~ | ~~Small~~ | **Done** |
| 5.5 | Send auction win email with checkout link | Critical | Small | Pending (notification sent via DB, not email) |
| ~~5.6~~ | ~~Send order confirmation email~~ | ~~High~~ | ~~Small~~ | **Done** (buyer + seller) |
| ~~5.7~~ | ~~Send shipping update email~~ | ~~Medium~~ | ~~Small~~ | **Done** |

---

## Phase 6: Security Hardening
**Goal**: Production-ready security posture.

| # | Task | Priority | Effort | Dependencies |
|---|------|----------|--------|-------------|
| 6.1 | Add server-side role check in Next.js middleware | High | Medium | None |
| 6.2 | Implement password reset flow | High | Medium | None |
| 6.3 | Add email verification on registration | Medium | Medium | 5.1 |
| 6.4 | IP-based rate limiting for auth endpoints | Medium | Small | None |
| 6.5 | Add idempotency key cleanup cron | Low | Small | None |
| 6.6 | Audit all API responses for data leakage | High | Medium | None |

---

## Phase 7: Mobile UX Polish
**Goal**: Luxury mobile shopping experience.

| # | Task | Priority | Effort | Dependencies |
|---|------|----------|--------|-------------|
| 7.1 | Add fixed bottom tab navigation (mobile) | High | Medium | None |
| 7.2 | Improve touch targets (min 44px) | Medium | Medium | None |
| 7.3 | Add swipe gestures to image gallery | Medium | Medium | None |
| 7.4 | Mobile-optimized search (full-screen overlay) | Medium | Medium | None |
| 7.5 | Pull-to-refresh on list pages | Low | Small | None |
| 7.6 | Add branded splash/loading screen | Low | Small | None |

---

## Phase 8: Advanced Features
**Goal**: Competitive differentiators.

| # | Task | Priority | Effort | Dependencies |
|---|------|----------|--------|-------------|
| 8.1 | Admin analytics dashboard with charts | Medium | Large | None |
| 8.2 | Seller analytics (earnings trends, top items) | Medium | Medium | None |
| 8.3 | Wishlist / saved items page | Medium | Small | None |
| 8.4 | Related items recommendations | Low | Medium | None |
| 8.5 | Recently viewed items | Low | Small | None |
| 8.6 | Social sharing (listing detail) | Low | Small | None |
| 8.7 | In-app chat (buyer ↔ seller) | Low | Large | None |

---

## Timeline Summary

| Phase | Duration Estimate | Status |
|-------|------------------|--------|
| Phase 0 | 1-2 days | In progress (0.5 done, others pending) |
| Phase 1 | 1-2 days | Backend done, frontend wiring pending |
| Phase 2 | 2-3 days | Pending |
| Phase 3 | 5-8 days | Pending (needs payment provider account) |
| Phase 4 | 1-2 days | Pending |
| Phase 5 | 1 day | Backend done, 2 emails pending |
| Phase 6 | 3-5 days | Pending |
| Phase 7 | 3-5 days | Pending |
| Phase 8 | 5-10 days | Pending |
