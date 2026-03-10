# Module: Submissions

## Ownership
- Backend: `backend/src/submissions/`
- Frontend: `frontend/src/app/(seller)/seller/submit/`, `frontend/src/app/(seller)/seller/submissions/`
- Admin: `frontend/src/app/(admin)/admin/submissions/`

## Purpose
Manages the item submission pipeline from seller intake through admin review, pickup, authentication, photography, and listing creation.

## Stage Pipeline
```
pending_review → price_suggested → price_accepted → pickup_scheduled →
driver_dispatched → arrived_at_office → auth_passed / auth_failed →
photoshoot_done → listed
```
Also: `price_rejected`, `rejected` (terminal states)

### Valid Transitions
| From | To |
|------|----|
| pending_review | price_suggested, rejected |
| price_suggested | price_accepted, price_rejected |
| price_accepted | pickup_scheduled |
| pickup_scheduled | driver_dispatched |
| driver_dispatched | arrived_at_office |
| arrived_at_office | auth_passed, auth_failed |
| auth_passed | photoshoot_done |
| photoshoot_done | listed |

Invalid transitions throw `BadRequestException`.

## Backend Components

### SubmissionsService
- `create(sellerId, data)` — Creates submission at `pending_review`, logs event, sends email, emits WebSocket
- `listBySeller(sellerId, stage?)` — Seller's own submissions, optional stage filter
- `listAll(stage?)` — Admin: all submissions, optional stage filter
- `getById(id, userId?, isAdmin?)` — Submission + events (checks ownership unless admin)
- `acceptPrice(id, sellerId)` — Seller accepts proposed price (must be at `price_suggested` stage)
- `rejectPrice(id, sellerId)` — Seller rejects proposed price
- `adminReview(id, adminId, action, data)` — Admin approve/reject with price
- `schedulePickup(id, adminId, data)` — Schedule pickup with date/time/address/driver
- `dispatchDriver(id, adminId)` — Mark driver dispatched
- `arrivedAtOffice(id, adminId)` — Mark arrived at office
- `qcResult(id, adminId, passed, notes?)` — Authentication pass/fail
- `photoshootDone(id, adminId, proPhotos[], proDescription?)` — Mark photoshoot complete

### SubmissionsController
| Method | Path | Auth | Roles | Purpose |
|--------|------|------|-------|---------|
| POST | `/submissions` | JWT | seller, vip_seller | Create submission |
| GET | `/submissions` | JWT | seller, vip_seller | List own submissions |
| GET | `/submissions/:id` | JWT | any | View submission detail |
| POST | `/submissions/:id/accept-price` | JWT | seller, vip_seller | Accept proposed price |
| POST | `/submissions/:id/reject-price` | JWT | seller, vip_seller | Reject proposed price |

## Admin Endpoints (via AdminController)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/admin/submissions` | List all submissions |
| GET | `/admin/submissions/:id` | View submission detail |
| PATCH | `/admin/submissions/:id/review` | Approve/reject with price |
| POST | `/admin/pickups` | Schedule pickup |
| PATCH | `/admin/pickups/:id/dispatch` | Dispatch driver |
| PATCH | `/admin/pickups/:id/arrived` | Mark arrived at office |
| POST | `/admin/qc-reports` | Submit QC/authentication result |

## Audit Trail
Every stage transition creates a `wimc_submission_events` row:
- `submission_id`, `actor_id`, `old_stage`, `new_stage`, `message`, `created_at`

## Notifications Triggered
| Stage Change | Notification Type | Recipient |
|-------------|-------------------|-----------|
| → price_suggested | price_suggested | Seller |
| → pickup_scheduled | (inline) | Seller |
| → auth_failed | (email + DB) | Seller |
| → listed | submission_received | Seller |

## Database Tables
- `wimc_submissions` — Main submission data
- `wimc_submission_events` — Audit trail

## Email Integration
Emails are sent via `EmailService` (Resend) at key stages:
- `create()` → `sendSubmissionReceived()` to seller
- `adminReview(approve)` → `sendPriceSuggested()` to seller
- `acceptPrice/rejectPrice` → `sendPriceResponse()` to admins
- `qcResult(failed)` → `sendAuthFailed()` to seller

## Known Gaps
- Frontend PhotoUploader not yet wired to `api.uploadSubmissionPhotos()` in submit flow
- Not all stage transitions send emails (e.g., pickup_scheduled, photoshoot_done)
- No bulk operations for admin
