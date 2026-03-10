# Security Rules

## Authentication

- JWT tokens issued by Supabase Auth
- Token validation: `supabase.auth.getUser(token)` on every protected request
- Token storage: `localStorage('wimc_token')` + HTTP cookie (SameSite=Lax, max-age=86400)
- Guard chain: `JwtAuthGuard` → `RolesGuard`
- Password: 8+ chars, 1 uppercase, 1 lowercase, 1 digit

## Authorization (RBAC)

Four roles: `buyer`, `seller`, `vip_seller`, `admin`

### Endpoint Access Matrix
| Action | buyer | seller | vip_seller | admin |
|--------|-------|--------|------------|-------|
| Browse/view | Y | Y | Y | Y |
| Place offers/bids | Y | - | - | - |
| Create orders | Y | - | - | Y |
| Create submissions | - | Y | Y | - |
| Accept/reject offers | - | Y | Y | - |
| Admin operations | - | - | - | Y |

## Data Privacy — NEVER Expose

| Data | Who Can See |
|------|------------|
| `bid.max_amount` | Only the bidder |
| `auction.reserve_price` | Only celebrity owner + admin |
| Seller address | Only seller + admin |
| Buyer shipping address | Only buyer + seller (on order) |
| User email | Only the user + admin |

**In every API response, DB query, and WebSocket event — verify these are not leaked.**

## Input Validation

- Global `ValidationPipe` with `whitelist: true` strips unknown properties
- All DTOs use `class-validator` decorators
- File uploads: validate MIME type (jpeg/png/webp/heic), enforce size limits
- SQL injection: prevented by Supabase SDK parameterized queries
- XSS: React JSX auto-escapes. Never use `dangerouslySetInnerHTML`

## Rate Limiting

| Scope | Limit |
|-------|-------|
| Global | 60 req/min |
| Auth register | 3 req/15 min |
| Auth login | 5 req/15 min |

## WebSocket Security

- Connection requires valid JWT token in auth handshake
- Max 5 connections per user
- Room access: users can only join their own `user:{id}` room
- Auction rooms: any authenticated user can join

## Headers

- Helmet enabled globally (X-Content-Type-Options, X-Frame-Options, etc.)
- CORS: configurable via `CORS_ORIGIN` env var, credentials enabled

## Checklist for New Endpoints

1. [ ] Is the endpoint behind `JwtAuthGuard`? (Unless intentionally public)
2. [ ] Is `@Roles()` decorator applied if role-restricted?
3. [ ] Are sensitive fields excluded from the response?
4. [ ] Is input validated via DTO with class-validator?
5. [ ] Is idempotency required for state-changing operations?
6. [ ] Are Supabase queries parameterized (using SDK, not raw SQL)?
7. [ ] Is the operation logged in an audit trail?
