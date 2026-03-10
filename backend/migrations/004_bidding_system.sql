-- 004_bidding_system.sql
-- Proxy Bidding System (eBay-style) + Celebrity Reserve Price

-- Add listing_type to wimc_listings
ALTER TABLE wimc_listings
  ADD COLUMN IF NOT EXISTS listing_type TEXT DEFAULT 'fixed_price'
    CHECK (listing_type IN ('fixed_price', 'auction'));

-- Auctions table — one record per auction listing
CREATE TABLE IF NOT EXISTS wimc_auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL UNIQUE REFERENCES wimc_listings(id) ON DELETE CASCADE,
  starting_price NUMERIC(10,2) NOT NULL,
  reserve_price NUMERIC(10,2),
  reserve_met BOOLEAN DEFAULT false,
  current_price NUMERIC(10,2),
  current_winner_id UUID REFERENCES wimc_profiles(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'cancelled')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  bid_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bids table — every bid placement
CREATE TABLE IF NOT EXISTS wimc_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES wimc_auctions(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES wimc_profiles(id),
  max_amount NUMERIC(10,2) NOT NULL,
  proxy_amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'winning' CHECK (status IN ('winning', 'outbid', 'won', 'lost')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wimc_auctions_listing ON wimc_auctions(listing_id);
CREATE INDEX IF NOT EXISTS idx_wimc_auctions_status_ends ON wimc_auctions(ends_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_wimc_bids_auction ON wimc_bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_wimc_bids_bidder ON wimc_bids(bidder_id);
