-- Performance Indexes Migration
-- Adds composite and partial indexes for frequently queried patterns

-- Browse page: filter by status + sort by created_at
CREATE INDEX IF NOT EXISTS idx_wimc_listings_status_created
ON wimc_listings(status, created_at DESC);

-- Celebrity listings filter (partial index - only non-null celebrity_id)
CREATE INDEX IF NOT EXISTS idx_wimc_listings_celebrity
ON wimc_listings(celebrity_id) WHERE celebrity_id IS NOT NULL;

-- Submissions pipeline overview (count by stage)
CREATE INDEX IF NOT EXISTS idx_wimc_submissions_stage
ON wimc_submissions(stage);

-- Orders by buyer (dashboard view)
CREATE INDEX IF NOT EXISTS idx_wimc_orders_buyer_created
ON wimc_orders(buyer_id, created_at DESC);

-- Orders by seller (seller dashboard)
CREATE INDEX IF NOT EXISTS idx_wimc_orders_seller_created
ON wimc_orders(seller_id, created_at DESC);

-- Active auctions sorted by end time (auction expiry checks)
CREATE INDEX IF NOT EXISTS idx_wimc_auctions_active_ends
ON wimc_auctions(ends_at) WHERE status = 'active';

-- Price range queries on published listings
CREATE INDEX IF NOT EXISTS idx_wimc_listings_price
ON wimc_listings(price) WHERE status = 'published';

-- Full-text search: add generated tsvector column + GIN index
ALTER TABLE wimc_listings ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(brand, '') || ' ' || coalesce(description, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_wimc_listings_search
ON wimc_listings USING gin(search_vector);

-- Notifications: unread by user (for badge count)
CREATE INDEX IF NOT EXISTS idx_wimc_notifications_user_unread
ON wimc_notifications(user_id, created_at DESC) WHERE read = false;

-- Offers by listing (check existing offers)
CREATE INDEX IF NOT EXISTS idx_wimc_offers_listing
ON wimc_offers(listing_id, status);

COMMENT ON INDEX idx_wimc_listings_status_created IS 'Browse page performance: status filter + date sort';
COMMENT ON INDEX idx_wimc_listings_search IS 'Full-text search on name, brand, description';
