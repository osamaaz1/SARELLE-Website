# Module: Offers

## Ownership
- Backend: `backend/src/offers/`
- Frontend: `frontend/src/app/(dashboard)/offers/`, `frontend/src/app/(seller)/seller/offers/`

## Purpose
Enables buyers to make price offers on fixed-price listings. Sellers can accept or reject. Includes idempotency protection.

## Backend Components

### OffersService
- `create(buyerId, dto)` — Create offer with idempotency check. Notifies seller via DB + WebSocket
- `findSent(buyerId)` — Buyer's sent offers with listing details
- `findReceived(sellerId)` — Seller's received pending offers
- `accept(offerId, sellerId)` — Accept offer, reject all other pending offers on same listing, mark listing `reserved`
- `reject(offerId, sellerId)` — Reject single offer
- `withdraw(offerId, buyerId)` — Buyer withdraws pending offer

### OffersController
| Method | Path | Auth | Roles | Purpose |
|--------|------|------|-------|---------|
| POST | `/offers` | JWT | buyer | Create offer |
| GET | `/offers/sent` | JWT | any | Buyer's sent offers |
| GET | `/offers/received` | JWT | seller, vip_seller | Seller's pending offers |
| PATCH | `/offers/:id/accept` | JWT | seller, vip_seller | Accept offer |
| PATCH | `/offers/:id/reject` | JWT | seller, vip_seller | Reject offer |
| POST | `/offers/:id/withdraw` | JWT | any | Withdraw pending offer |

## Business Rules
- Buyers cannot offer on their own listings
- Each offer requires a unique `idempotency_key` (24h expiry)
- Accepting one offer auto-rejects all other pending offers on the same listing
- Accepting marks listing as `reserved`
- Only pending offers can be accepted, rejected, or withdrawn
- Offer amounts in EGP, no min/max enforced by backend

## Offer Statuses
| Status | Meaning |
|--------|---------|
| pending | Awaiting seller response |
| accepted | Seller accepted, listing reserved |
| rejected | Seller declined |
| expired | Time-based expiry (not currently implemented) |
| withdrawn | Buyer cancelled before response |

## WebSocket Events
| Event | Room | Trigger |
|-------|------|---------|
| `offer:new` | `user:{sellerId}` | New offer created |
| `offer:updated` | `user:{buyerId}` | Offer accepted/rejected |

## Database Tables
- `wimc_offers` — Offers with listing_id, buyer_id, amount, status, idempotency_key
- `wimc_idempotency_keys` — Deduplication keys with 24h expiry
