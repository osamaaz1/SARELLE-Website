# Module: Bids (Proxy Bidding / Auctions)

## Ownership
- Backend: `backend/src/bids/`
- Frontend: `frontend/src/app/(public)/listing/[id]/page.tsx` (auction UI)
- Admin: auction creation via AdminController

## Purpose
Implements eBay-style proxy bidding. Users set a secret maximum bid; the system bids the minimum needed on their behalf. Celebrity listings can have a secret reserve price.

## Backend Components

### BidsService (`bids.service.ts`)

#### Core Methods
- `placeBid(auctionId, bidderId, maxAmount)` — Full proxy bidding engine (5 cases)
- `createAuction(data)` — Create auction for a published listing
- `endAuction(auctionId)` — End auction, handle reserve logic, notify winner
- `getAuctionByListing(listingId)` — Public auction data (omits reserve_price)
- `getAuctionByListingAdmin(listingId)` — Admin view (includes reserve_price)
- `getBidHistory(auctionId)` — Anonymized bid history (proxy_amount only)
- `getMyBids(userId)` — User's bids with their max_amount
- `adminListAuctions()` — All auctions for admin panel
- `getAuctionForOrder(auctionId)` — Validates auction for checkout

#### Proxy Logic — 5 Cases
| Case | Condition | Result |
|------|-----------|--------|
| A | First bid | price = starting_price, bidder wins |
| B | new_max > old_winner.max | price = old_max + increment, new bidder wins |
| C | new_max < old_winner.max | price = new_max + increment (capped at winner.max), old winner stays |
| D | new_max == old_winner.max | Earlier bidder wins (eBay tie rule) |
| E | Same bidder raising max | Update max_amount, price unchanged |

#### Bid Increment Tiers (EGP)
| Current Price | Increment |
|--------------|-----------|
| < 100 | 1 |
| 100–499 | 5 |
| 500–999 | 10 |
| 1,000–4,999 | 25 |
| 5,000–24,999 | 50 |
| 25,000+ | 100 |

### BidsController (`bids.controller.ts`)
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/bids/auction/:listingId` | None | Public auction data |
| GET | `/bids/auction/:auctionId/history` | None | Anonymized bid history |
| POST | `/bids` | JWT (buyer) | Place proxy bid |
| GET | `/bids/my-bids` | JWT | User's own bids |

### Admin Endpoints (via AdminController)
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/admin/auctions` | Create auction |
| GET | `/admin/auctions` | List all auctions (with reserve_price) |
| POST | `/admin/auctions/:id/end` | Manually end auction |

## Anti-Sniping
If a bid is placed within 5 minutes of `ends_at`, the auction is extended by 5 minutes from the current time.

## Reserve Price
- Only for celebrity listings (`celebrity_id` is not null)
- `reserve_price` visible only to celebrity owner + admin
- `reserve_met` boolean visible to everyone
- If auction ends with `reserve_met = false`: no sale, listing stays published, all bids marked `lost`

## Auction End Logic
1. **Reserve met + winner**: Listing → `reserved`, winning bid → `won`, all others → `lost`, notify winner to checkout within 48h
2. **Reserve not met**: No sale, all bids → `lost`, listing stays `published`
3. **No bids**: No action

## WebSocket Events
| Event | Room | Payload |
|-------|------|---------|
| `auction:bidPlaced` | `auction:{id}` | currentPrice, bidCount, reserveMet, endsAt |
| `auction:outbid` | `user:{bidderId}` | auctionId, listingName, currentPrice |
| `auction:ended` | `auction:{id}` | winningPrice, winnerId, reserveMet |

**Security**: `auction:bidPlaced` NEVER includes any user's max_amount.

## Frontend UI
- Countdown timer to auction end
- "Your Maximum Bid (EGP)" input with proxy explanation
- Reserve indicator badges (green = met, amber = not met)
- Anonymized bid history table
- Real-time WebSocket updates (join/leave auction rooms)
- Post-bid feedback: "You're the highest bidder!" or "You've been outbid"

## Database Tables
- `wimc_auctions` — Auction config and state per listing
- `wimc_bids` — Individual bids with secret max_amount and public proxy_amount

## Security Rules
| Data | Visibility |
|------|-----------|
| `max_amount` | Only the bidder |
| `reserve_price` | Only celebrity owner + admin |
| `reserve_met` | Everyone |
| `current_price` | Everyone |
| `proxy_amount` (bid history) | Everyone |
| Bidder names | Anonymized (first + last letter) |
