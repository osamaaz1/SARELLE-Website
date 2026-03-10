# Known Gaps, Risks & Assumptions

## Critical Gaps (Blocking Production)

### G1: No Payment Gateway
- **Impact**: Orders created but no money collected
- **Current state**: Checkout creates order at `pending_payment` — no payment capture
- **Required**: Stripe, Paymob (Egypt), or Fawry integration
- **Risk**: Cannot go live without this

### G2: Frontend Photo Upload Not Fully Wired
- **Impact**: Product images still show placeholders in production
- **Current state**: Backend `StorageModule` exists with full Multer integration (4 upload endpoints, MIME validation, size limits). Supabase Storage buckets created via migration 005. But frontend submission form's PhotoUploader component may not call the upload endpoint automatically during submission flow.
- **Required**: Wire frontend PhotoUploader → `api.uploadSubmissionPhotos()` in the seller submit flow. Verify listing photos display from Supabase Storage URLs.
- **Risk**: Sellers can submit items but photos may not persist to storage

### G4: No Auction Scheduler
- **Impact**: Auctions don't end automatically
- **Current state**: `endAuction()` exists but is only called manually via admin endpoint
- **Required**: Cron job or scheduled task to check `ends_at` and auto-end auctions
- **Risk**: Auctions never resolve without manual admin intervention

## High Priority Gaps

### G5: Branding Inconsistency (Partially Fixed)
- **Impact**: Confusing user experience
- **Current state**: Navbar and footer now display "WIMC" correctly. Some metadata, page titles, or legacy comments may still reference "Sarelle".
- **Required**: Audit all files for remaining "Sarelle" references (check `layout.tsx` metadata, any hardcoded strings)

### G6: No Server-Side Role Check in Middleware
- **Impact**: Anyone with a valid token can navigate to `/admin/*` or `/seller/*` client-side
- **Current state**: Route protection is client-side redirect only (AdminLayout checks role, redirects if not admin). Backend guards protect API calls.
- **Required**: Add role checking to Next.js middleware (decode JWT, check role claim)

### G7: No Frontend Notification UI
- **Impact**: Backend sends notifications but users never see them
- **Current state**: Full notification backend (create, list, mark read) but no bell icon, dropdown, or notification page
- **Required**: Notification bell in navbar + dropdown + /notifications page

### G8: Saved Items Broken in Mock Mode
- **Impact**: Heart/save button fails when `USE_MOCK=true`
- **Current state**: `toggleSave` calls real API, no mock fallback
- **Required**: Add mock implementation for save/unsave

## Medium Priority Gaps

### G9: No Password Reset Flow
- No forgot password page, no reset email, no Supabase password reset integration

### G10: No Email Verification
- Supabase auto-confirms on registration. No verification email sent.

### G11: No 2FA/MFA
- No multi-factor authentication option

### G12: No Real-Time Order Tracking
- Order detail page exists but no live status tracking or map integration

### G13: Celebrity Closet Links Broken
- Homepage celebrity cards link to `/celebrities` page, not individual `/closet/[sellerId]` pages

### G14: Footer Links All Point to `/policies`
- Every footer link under "Sell" and "Support" sections goes to the same page

### G15: No Admin Analytics/Charts
- Admin dashboard shows stat cards but no trend charts or analytics

## Low Priority Gaps

### G16: No CSRF Protection
- SPA uses localStorage tokens. CSRF not applicable for API calls but cookie-based middleware check could be vulnerable

### G17: No IP-Based Rate Limiting
- Global throttle is per-connection, not per-IP

### G18: No Idempotency Key Cleanup
- No scheduled job to purge expired keys from `wimc_idempotency_keys`

### G19: No Mobile Bottom Navigation
- Top navbar with hamburger menu only. No fixed bottom tab bar for mobile

### G20: No Splash/Loading Screen
- No branded initial loading screen

---

## Assumptions

| ID | Assumption | Impact if Wrong |
|----|-----------|-----------------|
| A1 | All prices are in EGP (Egyptian Pound) | Currency display and calculations wrong |
| A2 | Supabase free/pro tier is sufficient for scale | May need dedicated PostgreSQL |
| A3 | Render.com handles deployment scaling | May need AWS/GCP for high traffic |
| A4 | Single-region deployment (Egypt/MENA) | Latency issues if global users |
| A5 | Photo storage fits within Supabase Storage limits | May need CDN or S3 |
| A6 | 20% service fee is fixed (not configurable per listing) | Business model may need flexibility |
| A7 | Proxy bidding runs synchronously (no race conditions) | May need row-level locking under high load |
| A8 | Reserve price is only for celebrity listings | Business may want it for all auctions |
| A9 | Token expiry of 24h is acceptable | May need shorter for security |
| A10 | No mobile app needed (web-only) | Market may demand native apps |

---

## Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|-----------|--------|------------|
| R1 | Bid race condition under load | Medium | High | Add row-level locking or queue |
| R2 | Supabase rate limits hit | Low | High | Monitor usage, upgrade plan |
| R3 | No payment = no revenue | Certain | Critical | Prioritize payment integration |
| R4 | Photo storage costs scale linearly | Medium | Medium | Implement image compression, CDN |
| R5 | Admin bottleneck on manual processes | High | Medium | Automate auction end, payout triggers |
| R6 | Celebrity reserve price leaked | Low | High | Code review, never log reserve_price |
| R7 | JWT secret compromised | Low | Critical | Rotate keys, monitor for anomalies |
