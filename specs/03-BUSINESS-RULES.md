# Business Rules

## Authentication & Authorization

- **Password**: 8+ characters, at least 1 uppercase, 1 lowercase, 1 digit.
- **Roles**: buyer, seller, vip_seller, admin. Set at registration, changed only by admin.
- **JWT tokens**: Issued by Supabase Auth. Stored in localStorage (`wimc_token`) + cookie for middleware.
- **Token expiry**: 24 hours (cookie max-age=86400).
- **Admin access**: Server-side role check via `RolesGuard`. Client-side redirect in AdminLayout.
- **Seller access**: Server-side role check for seller-only endpoints.

## Submissions

- Only users with role `seller` or `vip_seller` can create submissions.
- Each submission follows a linear stage pipeline (see 00-PROJECT-OVERVIEW).
- Stage transitions are strictly validated. Invalid transitions throw `BadRequestException`.
- Every stage transition creates a `wimc_submission_events` audit entry.
- Sellers can only accept/reject price at `price_suggested` stage.
- Admin can only review submissions at `pending_review` stage.
- Pickup requires: date, time, address, driver phone. Optional Google Maps link.
- QC (authentication): If failed, seller is notified via email. Item does not proceed.
- Listing creation: Only from submissions at `auth_passed` or `photoshoot_done` stage.

## Listings

- Only `published` listings are visible to buyers (unless seller viewing their own).
- Browse pagination: max 100 items per page, default 20.
- Featured items: admin-flagged, returned by `/listings/featured` (max 8).
- Celebrity listings: items with a `celebrity_id` reference.
- `listing_type`: `fixed_price` (default) or `auction`.
- Auction listings cannot be purchased via "Buy Now" while auction is active.

## Offers

- Buyers only. Cannot offer on your own listing.
- **Idempotency**: Every offer requires a unique `idempotency_key` (24h expiry).
- Accepting one offer automatically rejects all other pending offers on the same listing.
- Accepting an offer marks the listing as `reserved`.
- Buyers can withdraw pending offers. Sellers can accept or reject.
- Offer amounts are in EGP. No minimum/maximum enforced by backend (frontend may suggest).

## Proxy Bidding (Auctions)

- **eBay-style proxy bidding**: Bidder sets a secret maximum. System bids minimum needed.
- `max_amount` is NEVER exposed to anyone except the bidder themselves.
- `reserve_price` is ONLY available for celebrity listings. Never shown publicly.
- `reserve_met` (boolean) IS shown publicly.

### Bid Increment Tiers (EGP)

| Current Price | Increment |
|--------------|-----------|
| < 100 | 1 |
| 100-499 | 5 |
| 500-999 | 10 |
| 1,000-4,999 | 25 |
| 5,000-24,999 | 50 |
| 25,000+ | 100 |

### Proxy Logic

| Case | Condition | Result |
|------|-----------|--------|
| A - First bid | No existing bids | price = starting_price, bidder wins |
| B - Higher max | new_max > old_winner.max | price = old_winner.max + increment, new bidder wins |
| C - Lower max | new_max < old_winner.max | price = new_max + increment (capped at winner.max), old winner stays |
| D - Tie | new_max == old_winner.max | Earlier bidder wins (eBay convention) |
| E - Same bidder | Same user raises max | Update max, price unchanged |

### Anti-Sniping

If a bid is placed within the last 5 minutes of `ends_at`, the auction is extended by 5 minutes from the current time.

### Auction End

- **Reserve met + winner**: Listing marked `reserved`. Winner notified to checkout within 48h.
- **Reserve not met**: No sale. All bids marked `lost`. Listing stays `published`.
- **No bids**: No action. Auction simply ends.

## Orders

- **Service fee**: 20% of item price (constant, not tier-based).
- **Shipping fee**: Flat EGP 50.
- **Total**: item_price + service_fee + shipping_fee.
- **Idempotency**: Every order requires a unique `idempotency_key`.
- If `offer_id` provided: validates offer is accepted, uses offer amount.
- If `auction_id` provided: validates auction ended, buyer is winner, reserve met. Uses auction price.
- Creating an order marks listing as `sold` atomically (prevents double-buy).

### Order Status Transitions

```
pending_payment -> paid, cancelled
paid            -> processing, cancelled
processing      -> shipped
shipped         -> delivered
delivered       -> completed, disputed
completed       -> (terminal)
cancelled       -> (terminal)
disputed        -> completed, cancelled
```

## Payouts

- Triggered by admin after order is delivered and inspection window ends.
- **Inspection window**: `PAYOUT_DELAY_DAYS` (default 3) days after delivery.
- Commission rate based on seller tier at time of payout.
- One payout per order (enforced by UNIQUE constraint).
- Payout amount = item_price - commission_amount.

## Notifications

- Created in-database for persistence.
- Pushed via WebSocket for real-time delivery.
- Types: submission_received, price_suggested, auction_outbid, auction_won, auction_ended, offer_new, offer_response, order_confirmation, shipping_update.

## File Storage

- Accepted: JPEG, PNG, WebP, HEIC.
- Submission photos: max 8 files, 5MB each.
- Listing photos: max 12 files, 5MB each.
- Avatars: max 1 file, 2MB.
- Stored in Supabase Storage buckets: `wimc-listings`, `wimc-avatars`.

## Currency & Locale

- Currency: Egyptian Pound (EGP). Format: `EGP 45,000`.
- Phone numbers: Egyptian format.
- Addresses: Egyptian (Cairo-centric, with Governorate field).
- **NOTE**: Some legacy code uses `$` instead of `EGP`. Should be `EGP` everywhere.
