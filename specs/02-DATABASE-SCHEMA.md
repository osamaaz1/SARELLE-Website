# Database Schema

All tables prefixed `wimc_`. Hosted on Supabase (PostgreSQL). Row Level Security enabled on all tables. Backend uses service role key (bypasses RLS).

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

## Tables

### wimc_profiles
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, FK -> auth.users |
| display_name | TEXT | NOT NULL |
| phone | TEXT | nullable |
| role | wimc_role | DEFAULT 'buyer' |
| avatar_url | TEXT | nullable |
| points | INTEGER | DEFAULT 0 |
| tier | TEXT | DEFAULT 'Bronze' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | auto-trigger |

### wimc_seller_profiles
| Column | Type | Constraints |
|--------|------|-------------|
| user_id | UUID | PK, FK -> wimc_profiles |
| address | TEXT | nullable |
| payout_method | JSONB | DEFAULT '{}' |
| google_maps_link | TEXT | nullable |
| created_at, updated_at | TIMESTAMPTZ | auto |

### wimc_vip_profiles
| Column | Type | Constraints |
|--------|------|-------------|
| user_id | UUID | PK, FK -> wimc_profiles |
| bio | TEXT | nullable |
| followers | TEXT | nullable |
| approved_by | UUID | FK -> wimc_profiles |
| approved_at | TIMESTAMPTZ | nullable |
| created_at, updated_at | TIMESTAMPTZ | auto |

### wimc_submissions
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, gen_random_uuid() |
| seller_id | UUID | FK -> wimc_profiles, NOT NULL |
| brand, name, category, condition | TEXT | NOT NULL |
| color | TEXT | nullable |
| description | TEXT | NOT NULL |
| user_photos | TEXT[] | DEFAULT '{}' |
| stage | wimc_submission_stage | DEFAULT 'pending_review' |
| proposed_price | NUMERIC(10,2) | nullable |
| admin_notes, rejection_reason | TEXT | nullable |
| pickup_date | DATE | nullable |
| pickup_time, pickup_address, driver_phone, google_maps_link | TEXT | nullable |
| pro_photos | TEXT[] | DEFAULT '{}' |
| pro_description | TEXT | nullable |
| final_price | NUMERIC(10,2) | nullable |
| created_at, updated_at | TIMESTAMPTZ | auto |

**Indexes**: seller_id, stage

### wimc_submission_events (audit trail)
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| submission_id | UUID | FK -> wimc_submissions |
| actor_id | UUID | FK -> wimc_profiles |
| message | TEXT | NOT NULL |
| old_stage | wimc_submission_stage | nullable |
| new_stage | wimc_submission_stage | NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### wimc_celebrities
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK -> wimc_profiles, nullable |
| name | TEXT | NOT NULL |
| bio, followers, avatar_url | TEXT | nullable |
| verified | BOOLEAN | DEFAULT false |
| created_at, updated_at | TIMESTAMPTZ | auto |

### wimc_listings
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| submission_id | UUID | FK -> wimc_submissions, nullable |
| seller_id | UUID | FK -> wimc_profiles, NOT NULL |
| brand, name, category, condition | TEXT | NOT NULL |
| price | NUMERIC(10,2) | NOT NULL |
| original_price | NUMERIC(10,2) | nullable |
| description | TEXT | nullable |
| photos | TEXT[] | DEFAULT '{}' |
| status | wimc_listing_status | DEFAULT 'published' |
| featured | BOOLEAN | DEFAULT false |
| celebrity_id | UUID | FK -> wimc_celebrities, nullable |
| listing_type | TEXT | DEFAULT 'fixed_price', CHECK ('fixed_price','auction') |
| created_at, updated_at | TIMESTAMPTZ | auto |

**Indexes**: seller_id, status, category, brand, celebrity_id

### wimc_auctions
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| listing_id | UUID | FK -> wimc_listings, UNIQUE |
| starting_price | NUMERIC(10,2) | NOT NULL |
| reserve_price | NUMERIC(10,2) | nullable (celebrity only) |
| reserve_met | BOOLEAN | DEFAULT false |
| current_price | NUMERIC(10,2) | nullable |
| current_winner_id | UUID | FK -> wimc_profiles, nullable |
| status | TEXT | CHECK ('active','ended','cancelled') |
| starts_at, ends_at | TIMESTAMPTZ | NOT NULL |
| bid_count | INTEGER | DEFAULT 0 |
| created_at, updated_at | TIMESTAMPTZ | auto |

**Indexes**: listing_id, (ends_at WHERE status='active')

### wimc_bids
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| auction_id | UUID | FK -> wimc_auctions |
| bidder_id | UUID | FK -> wimc_profiles |
| max_amount | NUMERIC(10,2) | NOT NULL (SECRET) |
| proxy_amount | NUMERIC(10,2) | NOT NULL (public visible) |
| status | TEXT | CHECK ('winning','outbid','won','lost') |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

**Indexes**: auction_id, bidder_id

### wimc_offers
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| listing_id | UUID | FK -> wimc_listings |
| buyer_id | UUID | FK -> wimc_profiles |
| amount | NUMERIC(10,2) | NOT NULL |
| status | wimc_offer_status | DEFAULT 'pending' |
| idempotency_key | TEXT | UNIQUE |
| created_at, updated_at | TIMESTAMPTZ | auto |

### wimc_orders
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| listing_id | UUID | FK -> wimc_listings |
| buyer_id, seller_id | UUID | FK -> wimc_profiles |
| item_price, service_fee, shipping_fee, total | NUMERIC(10,2) | NOT NULL |
| status | wimc_order_status | DEFAULT 'pending_payment' |
| tracking_number | TEXT | nullable |
| shipped_at, delivered_at, inspection_ends_at | TIMESTAMPTZ | nullable |
| shipping_address | JSONB | DEFAULT '{}' |
| idempotency_key | TEXT | UNIQUE |
| created_at, updated_at | TIMESTAMPTZ | auto |

### wimc_order_events (audit trail)
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| order_id | UUID | FK -> wimc_orders |
| from_status | wimc_order_status | nullable |
| to_status | wimc_order_status | NOT NULL |
| changed_by | UUID | FK -> wimc_profiles |
| reason | TEXT | nullable |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### wimc_payouts
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| order_id | UUID | FK -> wimc_orders, UNIQUE |
| seller_id | UUID | FK -> wimc_profiles |
| amount | NUMERIC(10,2) | NOT NULL |
| commission_rate, commission_amount | NUMERIC | NOT NULL |
| status | wimc_payout_status | DEFAULT 'pending' |
| scheduled_at, sent_at | TIMESTAMPTZ | nullable |
| created_at, updated_at | TIMESTAMPTZ | auto |

### wimc_notifications
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK -> wimc_profiles |
| type | TEXT | NOT NULL |
| title, message | TEXT | NOT NULL |
| read | BOOLEAN | DEFAULT false |
| action_url | TEXT | nullable |
| metadata | JSONB | DEFAULT '{}' |
| created_at, updated_at | TIMESTAMPTZ | auto |

### wimc_saved_items
| Column | Type | Constraints |
|--------|------|-------------|
| user_id | UUID | PK part, FK -> wimc_profiles |
| listing_id | UUID | PK part, FK -> wimc_listings |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### wimc_idempotency_keys
| Column | Type | Constraints |
|--------|------|-------------|
| key | TEXT | PK |
| user_id | UUID | FK -> wimc_profiles |
| endpoint | TEXT | NOT NULL |
| response_body | JSONB | nullable |
| expires_at | TIMESTAMPTZ | NOT NULL (24h) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### wimc_audit_log
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| entity_type | TEXT | NOT NULL |
| entity_id | UUID | NOT NULL |
| action | TEXT | NOT NULL |
| actor_id | UUID | FK -> wimc_profiles |
| old_value, new_value | JSONB | nullable |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

## Migration Files

| File | Purpose |
|------|---------|
| `001_wimc_schema.sql` | Full schema, enums, triggers, indexes, RLS policies |
| `002_seed_test_data.sql` | Test users, celebrities, listings, orders |
| `004_bidding_system.sql` | Auctions + bids tables, listing_type column |
| `005_storage_buckets.sql` | Supabase storage buckets + RLS |
