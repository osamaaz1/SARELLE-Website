# Security Specification

## Authentication

- **Method**: JWT via Supabase Auth.
- **Token storage**: localStorage (`wimc_token`) + HTTP cookie (SameSite=Lax, max-age=86400).
- **Backend validation**: `supabase.auth.getUser(token)` on every protected request.
- **Guard chain**: `JwtAuthGuard` (validates token) -> `RolesGuard` (checks role).

## Authorization (RBAC)

| Resource | buyer | seller | vip_seller | admin |
|----------|-------|--------|------------|-------|
| Browse/view listings | Y | Y | Y | Y |
| Place offers | Y | - | - | - |
| Place bids | Y | - | - | - |
| Create orders | Y | - | - | Y |
| Create submissions | - | Y | Y | - |
| Accept/reject prices | - | Y | Y | - |
| View received offers | - | Y | Y | - |
| Accept/reject offers | - | Y | Y | - |
| View payouts | - | Y | Y | - |
| Admin dashboard | - | - | - | Y |
| Review submissions | - | - | - | Y |
| Create listings | - | - | - | Y |
| Manage orders | - | - | - | Y |
| Create auctions | - | - | - | Y |
| Manage celebrities | - | - | - | Y |

## Data Privacy

| Data | Who can see |
|------|------------|
| `bid.max_amount` | Only the bidder |
| `auction.reserve_price` | Only celebrity owner + admin |
| `auction.reserve_met` (boolean) | Everyone |
| `auction.current_price` | Everyone |
| Bid history amounts (proxy_amount) | Everyone |
| Bidder names in history | Anonymized (first + last letter) |
| Seller address | Only seller + admin |
| Buyer shipping address | Only buyer + seller (on order) |
| User email | Only the user + admin (via Supabase Auth) |

## Rate Limiting

| Scope | Limit |
|-------|-------|
| Global | 60 requests per minute (ThrottlerModule) |
| Auth register | 3 requests per 15 minutes (ThrottlerGuard override) |
| Auth login | 5 requests per 15 minutes (ThrottlerGuard override) |

## Input Validation

- **Global pipe**: `ValidationPipe` with `whitelist: true`, `transform: true`. Strips unknown properties.
- **File uploads**: MIME type validation (jpeg/png/webp/heic), size limits (2-5MB per file), count limits.
- **SQL injection**: Prevented by Supabase SDK (parameterized queries).
- **XSS**: React's JSX auto-escapes. No `dangerouslySetInnerHTML` usage.

## Row Level Security (Supabase)

All tables have RLS enabled. Backend bypasses RLS via service role key. Key policies:

- Users see/update only their own profile.
- Sellers see only their own submissions.
- Published listings visible to all; other statuses only to seller.
- Offers visible only to buyer who made them.
- Orders visible to buyer + seller involved.
- Notifications visible only to target user.
- Saved items: user can CRUD only their own.
- Celebrities: visible to all (SELECT).

## Security Headers

- **Helmet**: Enabled globally in main.ts. Sets standard security headers (X-Content-Type-Options, X-Frame-Options, etc.).
- **CORS**: Configurable via `CORS_ORIGIN` env var. Credentials enabled.

## Known Gaps

1. **Middleware lacks role check**: Anyone with a valid token can navigate to `/admin/*` client-side. Protection is only in AdminLayout (client-side redirect) and backend guards.
2. **No CSRF protection**: SPA architecture uses localStorage tokens, not session cookies. CSRF not applicable for API calls but cookie-based middleware check is vulnerable in theory.
3. **No password reset flow**: Not implemented.
4. **No email verification**: Supabase auto-confirms on register.
5. **No 2FA/MFA**: Not implemented.
6. **No IP-based rate limiting**: Global throttle is per-connection, not per-IP.
7. **No admin IP whitelist**: Admin endpoints accessible from any IP.
8. **Idempotency key cleanup**: No scheduled job to purge expired keys.
