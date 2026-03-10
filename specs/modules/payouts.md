# Module: Payouts

## Ownership
- Backend: `backend/src/payouts/`
- Frontend: `frontend/src/app/(seller)/seller/payouts/`
- Admin: `frontend/src/app/(admin)/admin/payouts/`

## Purpose
Manages seller payouts after successful order delivery and inspection window completion.

## Backend Components

### PayoutsService
- `findBySeller(sellerId)` — Seller's payout history
- `findAll(status?)` — Admin: all payouts with optional status filter
- `trigger(orderId, actorId)` — Create payout for delivered order
- `updateStatus(id, status)` — Update payout status

### PayoutsController
| Method | Path | Auth | Roles | Purpose |
|--------|------|------|-------|---------|
| GET | `/payouts` | JWT | seller, vip_seller | Seller's payouts |

### Admin Endpoints (via AdminController)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/admin/payouts` | List all payouts |
| POST | `/admin/payouts/:orderId/trigger` | Trigger payout |
| PATCH | `/admin/payouts/:id/status` | Update payout status |

## Payout Calculation
```
commission_rate   = seller's tier rate at time of payout
commission_amount = item_price * (commission_rate / 100)
payout_amount     = item_price - commission_amount
```

### Commission Tiers
| Tier | Points Required | Commission Rate |
|------|----------------|-----------------|
| Bronze | 0 | 20% |
| Silver | 500 | 18% |
| Gold | 1,500 | 15% |
| Platinum | 5,000 | 12% |

## Payout Statuses
| Status | Meaning |
|--------|---------|
| pending | Created, awaiting scheduling |
| scheduled | Scheduled for processing |
| processing | Being processed |
| sent | Money transferred to seller |
| failed | Transfer failed |

## Rules
- Admin triggers payout after order delivered + inspection window (default 3 days)
- One payout per order (UNIQUE constraint on order_id)
- Inspection window: `PAYOUT_DELAY_DAYS` env var (default 3)
- Commission rate locked at payout time (seller tier may change later)

## Database Table
- `wimc_payouts` — order_id (UNIQUE), seller_id, amount, commission_rate, commission_amount, status

## Known Gaps
- No automated payout triggering (manual admin action only)
- No payment provider integration (bank transfer, mobile wallet)
- No payout receipts or invoices
- Inspection window not enforced programmatically
