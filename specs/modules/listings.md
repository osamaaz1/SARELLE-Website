# Module: Listings

## Ownership
- Backend: `backend/src/listings/`
- Frontend: `frontend/src/app/(public)/browse/`, `frontend/src/app/(public)/listing/[id]/`
- Admin: `frontend/src/app/(admin)/admin/listings/`

## Purpose
Manages the public-facing product catalog — browsing, searching, filtering, and individual listing display.

## Backend Components

### ListingsService
- `browse(params)` — Paginated listing search with filters (search, category, brand, condition, price range, sort)
- `getById(id)` — Single listing with seller profile
- `getFeatured()` — Admin-flagged featured listings (max 8)
- `getCelebrityListings()` — Celebrities with their associated listings
- `getSaved(userId)` — User's saved/wishlisted listings
- `toggleSave(userId, listingId)` — Save or unsave a listing
- `createFromSubmission(submissionId, adminId, data)` — Admin creates listing from approved submission
- `updateStatus(id, status)` — Admin changes listing status

Note: Seller closet (public listings by seller) is handled by `UsersService.getSellerCloset(sellerId)`.

### ListingsController
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/listings` | None | Browse with filters |
| GET | `/listings/featured` | None | Featured items (max 8) |
| GET | `/listings/celebrities` | None | Celebrity closets |
| GET | `/listings/:id` | None | Listing detail |
| GET | `/listings/saved` | JWT | User's saved items |
| POST | `/listings/:id/save` | JWT | Toggle save |

## Query Parameters (Browse)
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| search | string | — | Full-text search on name, brand, description |
| category | string | — | Filter by category |
| brand | string | — | Filter by brand |
| condition | string | — | Filter by condition |
| minPrice | number | — | Minimum price (EGP) |
| maxPrice | number | — | Maximum price (EGP) |
| sort | string | newest | `newest`, `oldest`, `price_asc`, `price_desc` |
| page | number | 1 | Page number |
| limit | number | 20 | Items per page (1-100) |

## Listing Types
- `fixed_price` (default) — Standard buy-now listing
- `auction` — Has associated `wimc_auctions` record, bidding enabled

## Listing Statuses
| Status | Visibility | Meaning |
|--------|-----------|---------|
| published | Public | Active, can be purchased/bid on |
| reserved | Public (no buy) | Offer accepted or auction won, awaiting checkout |
| sold | Public (view only) | Order created, sale complete |
| delisted | Hidden | Removed from marketplace |

## Frontend Components

### Browse Page (`browse/page.tsx`)
- FilterPanel with category, brand, condition, price range
- Search bar with debounced input
- Sort dropdown
- Pagination controls
- ProductCard grid (2 cols mobile, 3-4 desktop)
- Fetches auction data for auction-type listings

### Listing Detail (`listing/[id]/page.tsx`)
- ImageGallery with swipe support
- Price display / auction UI (countdown, bid history, proxy bid modal)
- Offer modal for fixed-price listings
- Reserve indicator for celebrity auctions
- Seller info card
- Related items section (not implemented)

### ProductCard (`components/marketplace/product-card.tsx`)
- Thumbnail, name, brand, price
- Auction overlay: bid count, mini countdown, current price
- Save/heart button
- Celebrity badge

## Database Table
- `wimc_listings` — Core listing data with photos[], seller_id, celebrity_id, listing_type

## Known Gaps
- No real product images (placeholder text shown)
- Saved items broken in mock mode
- No related items on listing detail
- No recently viewed tracking
- Search is basic (no full-text index)
