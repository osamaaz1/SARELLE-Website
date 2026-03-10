# Module: Orders

## Ownership
- Backend: `backend/src/orders/`
- Frontend: `frontend/src/app/(dashboard)/orders/`, `frontend/src/app/(dashboard)/checkout/`
- Admin: `frontend/src/app/(admin)/admin/orders/`

## Purpose
Handles order creation from buy-now, accepted offers, or auction wins. Manages order lifecycle through payment, shipping, delivery, and completion.

## Backend Components

### OrdersService
- `create(buyerId, dto)` — Creates order with idempotency, calculates fees, marks listing `sold`
- `findByUser(userId)` — User's orders (as buyer)
- `findOne(id, userId)` — Order detail with events
- `updateStatus(id, status, actorId, data?)` — Admin status transition with validation

### OrdersController
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/orders` | JWT | Create order |
| GET | `/orders` | JWT | List user's orders |
| GET | `/orders/:id` | JWT | Order detail + events |

### Admin Endpoints (via AdminController)
| Method | Path | Purpose |
|--------|------|---------|
| PATCH | `/admin/orders/:id/status` | Update order status |

## Order Creation Sources
| Source | Validation | Price Source |
|--------|-----------|-------------|
| Direct buy | Listing is `published` | `listing.price` |
| Accepted offer | Offer status is `accepted`, buyer matches | `offer.amount` |
| Auction win | Auction ended, buyer is winner, reserve met | `auction.current_price` |

## Pricing Formula
```
item_price     = listing price / offer amount / auction winning price
service_fee    = item_price * 0.20  (20% flat)
shipping_fee   = 50  (EGP, flat)
total          = item_price + service_fee + shipping_fee
```

## Status Transitions
```
pending_payment → paid, cancelled
paid            → processing, cancelled
processing      → shipped
shipped         → delivered
delivered       → completed, disputed
completed       → (terminal)
cancelled       → (terminal)
disputed        → completed, cancelled
```

Invalid transitions throw `BadRequestException`.

## Idempotency
- Every order requires `idempotency_key`
- Checked against `wimc_idempotency_keys` table
- 24h expiry
- Prevents double-purchase

## Atomicity
- Listing status is set to `sold` in the same operation as order creation
- Prevents race condition where two buyers purchase the same item

## Audit Trail
Every status change creates a `wimc_order_events` row:
- `order_id`, `from_status`, `to_status`, `changed_by`, `reason`, `created_at`

## WebSocket Events
| Event | Room | Trigger |
|-------|------|---------|
| `order:new` | `user:{sellerId}` + `admin` | Order created |
| `order:status-changed` | `user:{buyerId}` + `user:{sellerId}` | Status updated |

## Frontend Pages
- **Checkout** (`checkout/[listingId]/page.tsx`): Address form + order summary. Supports `?auction_id=` query param for auction winners
- **Orders list** (`orders/page.tsx`): Status badges, filterable
- **Order detail** (`orders/[id]/page.tsx`): Item info, tracking, timeline, price breakdown

## Database Tables
- `wimc_orders` — Order data with pricing, status, shipping address (JSONB), tracking
- `wimc_order_events` — Status transition audit trail

## Note: Unused Enum Values
The DB enum `wimc_order_status` includes `inspection_window` and `refunded` but neither is used in the backend service's `VALID_ORDER_TRANSITIONS` map yet. These are reserved for future implementation.

## Known Gaps
- No payment gateway integration
- No shipping provider API
- No automated status transitions (e.g., auto-complete after delivery window)
- `inspection_window` status not wired into transition logic (payout service checks `inspection_ends_at` timestamp instead)
- `refunded` status not implemented (no refund flow exists)
