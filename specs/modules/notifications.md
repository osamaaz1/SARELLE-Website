# Module: Notifications

## Ownership
- Backend: `backend/src/notifications/`
- Frontend: No dedicated UI yet (backend-only)

## Purpose
Creates persistent in-database notifications and pushes them via WebSocket for real-time delivery.

## Backend Components

### NotificationsService
- `create(userId, type, title, message, actionUrl?, metadata?)` — Insert notification + emit WebSocket
- `findByUser(userId, page, limit)` — Paginated user notifications
- `getUnreadCount(userId)` — Count of unread notifications
- `markRead(id, userId)` — Mark single notification read
- `markAllRead(userId)` — Mark all user notifications read

### NotificationsController
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/notifications` | JWT | Paginated notifications |
| GET | `/notifications/unread-count` | JWT | Unread count |
| PATCH | `/notifications/:id/read` | JWT | Mark one read |
| POST | `/notifications/read-all` | JWT | Mark all read |

## Notification Types
| Type | Trigger | Recipient |
|------|---------|-----------|
| submission_received | Submission created | Seller |
| price_suggested | Admin suggests price | Seller |
| auction_outbid | New higher bid placed | Previous winning bidder |
| auction_won | Auction ended, user won | Winner |
| auction_ended | Auction ended | All bidders in auction |
| offer_new | New offer on listing | Seller |
| offer_response | Offer accepted/rejected | Buyer |
| order_confirmation | Order created | Buyer + Seller |
| shipping_update | Order status changed | Buyer |

## WebSocket Delivery
- Event: `notification`
- Room: `user:{userId}`
- Payload: Full notification object

## Database Table
- `wimc_notifications` — user_id, type, title, message, read, action_url, metadata (JSONB)

## RLS Policy
- Users can only see their own notifications

## Known Gaps
- No frontend notification bell/dropdown/page
- No SMS delivery (email IS available via Resend `EmailService` — but sent separately from notification creation, not auto-triggered by this module)
- No push notifications (mobile)
- No notification preferences/settings
- No batch notification support
