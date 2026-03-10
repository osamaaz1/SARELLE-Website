# API Reference

Base URL: `{BACKEND_URL}/api`
Auth: JWT Bearer token in `Authorization` header
Rate Limit: 60 req/min global (auth endpoints: 3-5 req/15min)

## Authentication

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/auth/register` | None | `{email, password, role, displayName}` | `{user, session}` |
| POST | `/auth/login` | None | `{email, password}` | `{user, session}` |
| GET | `/auth/me` | JWT | -- | Profile object |

**Password rules**: 8+ chars, 1 uppercase, 1 lowercase, 1 digit.
**Display name**: 2+ chars.

## Users

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/users/profile` | JWT | -- | Full profile |
| PATCH | `/users/profile` | JWT | `{display_name?, phone?, avatar_url?}` | Updated profile |
| GET | `/users/:id/closet` | None | -- | Seller's published listings |

## Listings

| Method | Path | Auth | Body/Query | Response |
|--------|------|------|------------|----------|
| GET | `/listings` | None | `?search&category&brand&condition&minPrice&maxPrice&sort&page&limit` | `{listings[], total, page, totalPages}` |
| GET | `/listings/featured` | None | -- | Listing[] (max 8) |
| GET | `/listings/celebrities` | None | -- | Celebrity[] with nested listings |
| GET | `/listings/:id` | None | -- | Listing + seller profile |
| GET | `/listings/saved` | JWT | -- | Listing[] |
| POST | `/listings/:id/save` | JWT | -- | `{saved: boolean}` |

**Sort values**: `newest` (default), `oldest`, `price_asc`, `price_desc`.
**Limit**: 1-100, default 20.

## Submissions

| Method | Path | Auth | Roles | Body | Response |
|--------|------|------|-------|------|----------|
| POST | `/submissions` | JWT | seller, vip_seller | `{brand, name, category, condition, color?, description}` | Submission |
| GET | `/submissions` | JWT | seller, vip_seller | `?stage=...` | Submission[] |
| GET | `/submissions/:id` | JWT | -- | -- | Submission + events |
| POST | `/submissions/:id/accept-price` | JWT | seller, vip_seller | -- | Updated submission |
| POST | `/submissions/:id/reject-price` | JWT | seller, vip_seller | -- | Updated submission |

## Offers

| Method | Path | Auth | Roles | Body | Response |
|--------|------|------|-------|------|----------|
| POST | `/offers` | JWT | buyer | `{listing_id, amount, idempotency_key}` | Offer |
| GET | `/offers/sent` | JWT | -- | -- | Offer[] |
| GET | `/offers/received` | JWT | seller, vip_seller | -- | Offer[] (pending only) |
| PATCH | `/offers/:id/accept` | JWT | seller, vip_seller | -- | Offer |
| PATCH | `/offers/:id/reject` | JWT | seller, vip_seller | -- | Offer |
| POST | `/offers/:id/withdraw` | JWT | -- | -- | Offer |

## Bids / Auctions

| Method | Path | Auth | Roles | Body | Response |
|--------|------|------|-------|------|----------|
| GET | `/bids/auction/:listingId` | None | -- | -- | Auction (no reserve_price) |
| GET | `/bids/auction/:auctionId/history` | None | -- | -- | Anonymized bid[] |
| POST | `/bids` | JWT | buyer | `{auction_id, max_amount}` | `{status, current_price, bid_count, reserve_met, ends_at, message}` |
| GET | `/bids/my-bids` | JWT | -- | -- | Bid[] (includes max_amount) |

**Security**: `max_amount` never exposed publicly. `reserve_price` never in public response. Bid history shows anonymized names (first + last letter).

## Orders

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/orders` | JWT | `{listing_id, shipping_address, idempotency_key, offer_id?, auction_id?}` | Order |
| GET | `/orders` | JWT | -- | Order[] |
| GET | `/orders/:id` | JWT | -- | Order + events |

**Pricing**: `item_price + service_fee (20%) + shipping_fee (EGP 50) = total`

## Payouts

| Method | Path | Auth | Roles |
|--------|------|------|-------|
| GET | `/payouts` | JWT | seller, vip_seller |

## Notifications

| Method | Path | Auth | Body/Query | Response |
|--------|------|------|------------|----------|
| GET | `/notifications` | JWT | `?page=1&limit=20` | `{notifications[], total, page, totalPages}` |
| GET | `/notifications/unread-count` | JWT | -- | `{count}` |
| PATCH | `/notifications/:id/read` | JWT | -- | -- |
| POST | `/notifications/read-all` | JWT | -- | -- |

## Storage

| Method | Path | Auth | Roles | Max Files | Max Size |
|--------|------|------|-------|-----------|----------|
| POST | `/storage/submission-photos/:id` | JWT | seller | 8 | 5MB each |
| POST | `/storage/listing-photos/:id` | JWT | admin | 12 | 5MB each |
| POST | `/storage/avatar` | JWT | -- | 1 | 2MB |
| POST | `/storage/celebrity-avatar/:id` | JWT | admin | 1 | 2MB |

**Allowed types**: image/jpeg, image/png, image/webp, image/heic.

## Admin Endpoints

All require JWT + admin role.

| Method | Path | Body | Purpose |
|--------|------|------|---------|
| GET | `/admin/dashboard` | -- | Stats + pipeline |
| GET | `/admin/submissions` | `?stage=...` | List all submissions |
| GET | `/admin/submissions/:id` | -- | Submission detail |
| PATCH | `/admin/submissions/:id/review` | `{action, proposed_price?, rejection_reason?, admin_notes?}` | Review |
| POST | `/admin/pickups` | `{submission_id, pickup_date, pickup_time, pickup_address, driver_phone, google_maps_link?}` | Schedule |
| PATCH | `/admin/pickups/:id/dispatch` | -- | Dispatch driver |
| PATCH | `/admin/pickups/:id/arrived` | -- | Mark arrived |
| POST | `/admin/qc-reports` | `{submission_id, passed, notes?}` | QC result |
| POST | `/admin/listings` | `{submission_id, photos[], description?, price, featured?}` | Create listing |
| PATCH | `/admin/listings/:id` | `{status}` | Update status |
| PATCH | `/admin/orders/:id/status` | `{status, tracking_number?, reason?}` | Update order |
| GET | `/admin/payouts` | `?status=...` | List payouts |
| POST | `/admin/payouts/:orderId/trigger` | -- | Trigger payout |
| PATCH | `/admin/payouts/:id/status` | `{status}` | Update payout |
| GET | `/admin/sellers` | `?page=...` | List sellers |
| GET | `/admin/celebrities` | -- | List celebrities |
| POST | `/admin/celebrities` | `{name, bio, followers, avatar_url?, user_id?}` | Create celebrity |
| POST | `/admin/auctions` | `{listing_id, starting_price, starts_at, ends_at, reserve_price?}` | Create auction |
| GET | `/admin/auctions` | -- | List all auctions (includes reserve_price) |
| POST | `/admin/auctions/:id/end` | -- | End auction manually |

## WebSocket Events

Connect to `{WS_URL}` with `auth: { token }`.

### Client -> Server
| Event | Payload | Purpose |
|-------|---------|---------|
| `auction:join` | `auctionId` | Join auction room |
| `auction:leave` | `auctionId` | Leave auction room |

### Server -> Client
| Event | Room | Payload |
|-------|------|---------|
| `notification` | `user:{id}` | Notification object |
| `offer:new` | `user:{sellerId}` | Offer object |
| `offer:updated` | `user:{buyerId}` | `{id, status}` |
| `order:new` | `user:{sellerId}` + `admin` | Order object |
| `order:status-changed` | `user:{buyerId}` + `user:{sellerId}` | `{id, status, tracking_number?}` |
| `submission:stage-changed` | `user:{sellerId}` + `admin` | Submission + event |
| `auction:bidPlaced` | `auction:{id}` | `{current_price, bid_count, reserve_met, ends_at}` |
| `auction:outbid` | `user:{bidderId}` | `{auction_id, listing_name, current_price}` |
| `auction:ended` | `auction:{id}` | `{winning_price, winner_id, reserve_met}` |
