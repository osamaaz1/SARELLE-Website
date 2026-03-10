# Database Rules — Supabase (PostgreSQL)

## Naming Conventions

- All tables: `wimc_` prefix (e.g., `wimc_listings`)
- All enums: `wimc_` prefix (e.g., `wimc_role`)
- Indexes: `idx_wimc_{table}_{column}` (e.g., `idx_wimc_listings_seller`)
- Foreign keys: reference column name matches target table (e.g., `seller_id` → `wimc_profiles.id`)
- Timestamps: `created_at` and `updated_at` on every table (TIMESTAMPTZ, DEFAULT NOW())

## Column Standards

| Type | Convention |
|------|-----------|
| Primary keys | UUID, `gen_random_uuid()` |
| Money/prices | `NUMERIC(10,2)` |
| Status fields | Enum type or TEXT with CHECK constraint |
| JSON data | `JSONB` with DEFAULT `'{}'` |
| Arrays | `TEXT[]` with DEFAULT `'{}'` |
| Booleans | DEFAULT specified (false or true) |
| Timestamps | TIMESTAMPTZ, never plain TIMESTAMP |

## Row Level Security

- RLS is enabled on ALL tables. Never disable it.
- Backend uses service role key (bypasses RLS).
- Key policies:
  - Users see/update only their own profile
  - Sellers see only their own submissions
  - Published listings visible to all
  - Offers visible only to the buyer who made them
  - Orders visible to buyer + seller involved
  - Notifications visible only to target user

## Migration Files

Location: `backend/migrations/`

| File | Purpose |
|------|---------|
| `001_wimc_schema.sql` | Full schema, enums, triggers, indexes, RLS |
| `002_seed_test_data.sql` | Test data (users, celebrities, listings) |
| `004_bidding_system.sql` | Auctions + bids tables, listing_type column |
| `005_storage_buckets.sql` | Supabase storage buckets + RLS |

### Writing Migrations
- Use sequential numbering (next: `006_*.sql`)
- Include both UP and DOWN logic (commented down at bottom)
- Use `IF NOT EXISTS` for idempotent creates
- Test on a branch database before merging

## Enums

```sql
wimc_role:             buyer, seller, vip_seller, admin
wimc_submission_stage: pending_review, price_suggested, price_accepted, price_rejected,
                       pickup_scheduled, driver_dispatched, arrived_at_office,
                       auth_passed, auth_failed, photoshoot_done, listed, rejected
wimc_listing_status:   published, reserved, sold, delisted
wimc_offer_status:     pending, accepted, rejected, expired, withdrawn
wimc_order_status:     pending_payment, paid, processing, shipped, delivered,
                       inspection_window, completed, cancelled, refunded
wimc_payout_status:    pending, scheduled, processing, sent, failed
```

## Triggers

- `updated_at` auto-update trigger on all tables with `updated_at` column
- Trigger function: `trigger_set_updated_at()`

## Performance

- Index all foreign keys
- Index status/stage columns used in WHERE clauses
- Use partial indexes where appropriate (e.g., `WHERE status = 'active'`)
- Pagination: always use `LIMIT` + `OFFSET` or cursor-based

## Data Integrity

- UNIQUE constraints: `wimc_auctions.listing_id`, `wimc_payouts.order_id`, `wimc_idempotency_keys.key`
- Composite PKs: `wimc_saved_items(user_id, listing_id)`
- Foreign keys: CASCADE on delete only where appropriate (most use RESTRICT)
- Never delete data in production — use status fields (delisted, cancelled, etc.)
