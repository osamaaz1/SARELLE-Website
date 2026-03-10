-- =============================================
-- WIMC Luxury Resale Marketplace - Full Schema
-- Safe to re-run (fully idempotent)
-- =============================================

-- === ENUMS ===
DO $$ BEGIN
  CREATE TYPE wimc_role AS ENUM ('buyer', 'seller', 'vip_seller', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE wimc_submission_stage AS ENUM (
    'pending_review', 'price_suggested', 'price_accepted', 'price_rejected',
    'pickup_scheduled', 'driver_dispatched', 'arrived_at_office',
    'auth_passed', 'auth_failed', 'photoshoot_done', 'listed', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE wimc_listing_status AS ENUM ('published', 'reserved', 'sold', 'delisted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE wimc_offer_status AS ENUM ('pending', 'accepted', 'rejected', 'expired', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE wimc_order_status AS ENUM (
    'pending_payment', 'paid', 'processing', 'shipped', 'delivered',
    'inspection_window', 'completed', 'cancelled', 'refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE wimc_payout_status AS ENUM ('pending', 'scheduled', 'processing', 'sent', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- === HELPER: updated_at trigger function ===
CREATE OR REPLACE FUNCTION wimc_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- === TABLES ===

-- 1. Profiles
CREATE TABLE IF NOT EXISTS wimc_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  phone TEXT,
  role wimc_role NOT NULL DEFAULT 'buyer',
  avatar_url TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'Bronze',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS wimc_profiles_updated_at ON wimc_profiles;
CREATE TRIGGER wimc_profiles_updated_at BEFORE UPDATE ON wimc_profiles
  FOR EACH ROW EXECUTE FUNCTION wimc_set_updated_at();

-- 2. Seller Profiles
CREATE TABLE IF NOT EXISTS wimc_seller_profiles (
  user_id UUID PRIMARY KEY REFERENCES wimc_profiles(id) ON DELETE CASCADE,
  address TEXT,
  payout_method JSONB DEFAULT '{}',
  google_maps_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS wimc_seller_profiles_updated_at ON wimc_seller_profiles;
CREATE TRIGGER wimc_seller_profiles_updated_at BEFORE UPDATE ON wimc_seller_profiles
  FOR EACH ROW EXECUTE FUNCTION wimc_set_updated_at();

-- 3. VIP Profiles
CREATE TABLE IF NOT EXISTS wimc_vip_profiles (
  user_id UUID PRIMARY KEY REFERENCES wimc_profiles(id) ON DELETE CASCADE,
  bio TEXT,
  followers TEXT,
  approved_by UUID REFERENCES wimc_profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS wimc_vip_profiles_updated_at ON wimc_vip_profiles;
CREATE TRIGGER wimc_vip_profiles_updated_at BEFORE UPDATE ON wimc_vip_profiles
  FOR EACH ROW EXECUTE FUNCTION wimc_set_updated_at();

-- 4. Submissions
CREATE TABLE IF NOT EXISTS wimc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES wimc_profiles(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  condition TEXT NOT NULL,
  color TEXT,
  description TEXT NOT NULL,
  user_photos TEXT[] DEFAULT '{}',
  stage wimc_submission_stage NOT NULL DEFAULT 'pending_review',
  proposed_price NUMERIC(10,2),
  admin_notes TEXT,
  rejection_reason TEXT,
  pickup_date DATE,
  pickup_time TEXT,
  pickup_address TEXT,
  driver_phone TEXT,
  google_maps_link TEXT,
  pro_photos TEXT[] DEFAULT '{}',
  pro_description TEXT,
  final_price NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS wimc_submissions_updated_at ON wimc_submissions;
CREATE TRIGGER wimc_submissions_updated_at BEFORE UPDATE ON wimc_submissions
  FOR EACH ROW EXECUTE FUNCTION wimc_set_updated_at();
CREATE INDEX IF NOT EXISTS idx_wimc_submissions_seller ON wimc_submissions(seller_id);
CREATE INDEX IF NOT EXISTS idx_wimc_submissions_stage ON wimc_submissions(stage);

-- 5. Submission Events (audit trail)
CREATE TABLE IF NOT EXISTS wimc_submission_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES wimc_submissions(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES wimc_profiles(id),
  message TEXT NOT NULL,
  old_stage wimc_submission_stage,
  new_stage wimc_submission_stage NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wimc_submission_events_sub ON wimc_submission_events(submission_id);

-- 6. Celebrities
CREATE TABLE IF NOT EXISTS wimc_celebrities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES wimc_profiles(id),
  name TEXT NOT NULL,
  bio TEXT,
  followers TEXT,
  avatar_url TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS wimc_celebrities_updated_at ON wimc_celebrities;
CREATE TRIGGER wimc_celebrities_updated_at BEFORE UPDATE ON wimc_celebrities
  FOR EACH ROW EXECUTE FUNCTION wimc_set_updated_at();

-- 7. Listings
CREATE TABLE IF NOT EXISTS wimc_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES wimc_submissions(id),
  seller_id UUID NOT NULL REFERENCES wimc_profiles(id),
  brand TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  condition TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  original_price NUMERIC(10,2),
  description TEXT,
  photos TEXT[] DEFAULT '{}',
  status wimc_listing_status NOT NULL DEFAULT 'published',
  featured BOOLEAN NOT NULL DEFAULT false,
  celebrity_id UUID REFERENCES wimc_celebrities(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS wimc_listings_updated_at ON wimc_listings;
CREATE TRIGGER wimc_listings_updated_at BEFORE UPDATE ON wimc_listings
  FOR EACH ROW EXECUTE FUNCTION wimc_set_updated_at();
CREATE INDEX IF NOT EXISTS idx_wimc_listings_seller ON wimc_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_wimc_listings_status ON wimc_listings(status);
CREATE INDEX IF NOT EXISTS idx_wimc_listings_category ON wimc_listings(category);
CREATE INDEX IF NOT EXISTS idx_wimc_listings_brand ON wimc_listings(brand);
CREATE INDEX IF NOT EXISTS idx_wimc_listings_celebrity ON wimc_listings(celebrity_id);

-- 8. Offers
CREATE TABLE IF NOT EXISTS wimc_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES wimc_listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES wimc_profiles(id),
  amount NUMERIC(10,2) NOT NULL,
  status wimc_offer_status NOT NULL DEFAULT 'pending',
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS wimc_offers_updated_at ON wimc_offers;
CREATE TRIGGER wimc_offers_updated_at BEFORE UPDATE ON wimc_offers
  FOR EACH ROW EXECUTE FUNCTION wimc_set_updated_at();
CREATE INDEX IF NOT EXISTS idx_wimc_offers_listing ON wimc_offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_wimc_offers_buyer ON wimc_offers(buyer_id);

-- 9. Orders
CREATE TABLE IF NOT EXISTS wimc_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES wimc_listings(id),
  buyer_id UUID NOT NULL REFERENCES wimc_profiles(id),
  seller_id UUID NOT NULL REFERENCES wimc_profiles(id),
  item_price NUMERIC(10,2) NOT NULL,
  service_fee NUMERIC(10,2) NOT NULL,
  shipping_fee NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  status wimc_order_status NOT NULL DEFAULT 'pending_payment',
  tracking_number TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  inspection_ends_at TIMESTAMPTZ,
  shipping_address JSONB DEFAULT '{}',
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS wimc_orders_updated_at ON wimc_orders;
CREATE TRIGGER wimc_orders_updated_at BEFORE UPDATE ON wimc_orders
  FOR EACH ROW EXECUTE FUNCTION wimc_set_updated_at();
CREATE INDEX IF NOT EXISTS idx_wimc_orders_buyer ON wimc_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_wimc_orders_seller ON wimc_orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_wimc_orders_status ON wimc_orders(status);

-- 10. Order Events (audit trail)
CREATE TABLE IF NOT EXISTS wimc_order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES wimc_orders(id) ON DELETE CASCADE,
  from_status wimc_order_status,
  to_status wimc_order_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES wimc_profiles(id),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wimc_order_events_order ON wimc_order_events(order_id);

-- 11. Payouts
CREATE TABLE IF NOT EXISTS wimc_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES wimc_orders(id),
  seller_id UUID NOT NULL REFERENCES wimc_profiles(id),
  amount NUMERIC(10,2) NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,
  status wimc_payout_status NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT wimc_payouts_order_unique UNIQUE(order_id)
);
DROP TRIGGER IF EXISTS wimc_payouts_updated_at ON wimc_payouts;
CREATE TRIGGER wimc_payouts_updated_at BEFORE UPDATE ON wimc_payouts
  FOR EACH ROW EXECUTE FUNCTION wimc_set_updated_at();
CREATE INDEX IF NOT EXISTS idx_wimc_payouts_seller ON wimc_payouts(seller_id);

-- 12. Notifications
CREATE TABLE IF NOT EXISTS wimc_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES wimc_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS wimc_notifications_updated_at ON wimc_notifications;
CREATE TRIGGER wimc_notifications_updated_at BEFORE UPDATE ON wimc_notifications
  FOR EACH ROW EXECUTE FUNCTION wimc_set_updated_at();
CREATE INDEX IF NOT EXISTS idx_wimc_notifications_user ON wimc_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_wimc_notifications_unread ON wimc_notifications(user_id) WHERE read = false;

-- 13. Saved Items (Wishlist)
CREATE TABLE IF NOT EXISTS wimc_saved_items (
  user_id UUID NOT NULL REFERENCES wimc_profiles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES wimc_listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, listing_id)
);

-- 14. Idempotency Keys
CREATE TABLE IF NOT EXISTS wimc_idempotency_keys (
  key TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES wimc_profiles(id),
  endpoint TEXT NOT NULL,
  response_body JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wimc_idempotency_expires ON wimc_idempotency_keys(expires_at);

-- 15. Audit Log
CREATE TABLE IF NOT EXISTS wimc_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID REFERENCES wimc_profiles(id),
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wimc_audit_entity ON wimc_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_wimc_audit_actor ON wimc_audit_log(actor_id);

-- === ROW LEVEL SECURITY ===
ALTER TABLE wimc_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wimc_seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wimc_vip_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wimc_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wimc_submission_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE wimc_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wimc_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wimc_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wimc_order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE wimc_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wimc_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE wimc_saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wimc_celebrities ENABLE ROW LEVEL SECURITY;
ALTER TABLE wimc_idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE wimc_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop first to allow re-run)
DROP POLICY IF EXISTS wimc_profiles_select_own ON wimc_profiles;
CREATE POLICY wimc_profiles_select_own ON wimc_profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS wimc_profiles_update_own ON wimc_profiles;
CREATE POLICY wimc_profiles_update_own ON wimc_profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS wimc_submissions_select_own ON wimc_submissions;
CREATE POLICY wimc_submissions_select_own ON wimc_submissions FOR SELECT USING (auth.uid() = seller_id);
DROP POLICY IF EXISTS wimc_submissions_insert_own ON wimc_submissions;
CREATE POLICY wimc_submissions_insert_own ON wimc_submissions FOR INSERT WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS wimc_listings_select_published ON wimc_listings;
CREATE POLICY wimc_listings_select_published ON wimc_listings FOR SELECT USING (status = 'published' OR seller_id = auth.uid());

DROP POLICY IF EXISTS wimc_offers_select_own ON wimc_offers;
CREATE POLICY wimc_offers_select_own ON wimc_offers FOR SELECT USING (buyer_id = auth.uid());
DROP POLICY IF EXISTS wimc_offers_insert_own ON wimc_offers;
CREATE POLICY wimc_offers_insert_own ON wimc_offers FOR INSERT WITH CHECK (buyer_id = auth.uid());

DROP POLICY IF EXISTS wimc_orders_select_own ON wimc_orders;
CREATE POLICY wimc_orders_select_own ON wimc_orders FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid());

DROP POLICY IF EXISTS wimc_notifications_select_own ON wimc_notifications;
CREATE POLICY wimc_notifications_select_own ON wimc_notifications FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS wimc_notifications_update_own ON wimc_notifications;
CREATE POLICY wimc_notifications_update_own ON wimc_notifications FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS wimc_saved_items_select_own ON wimc_saved_items;
CREATE POLICY wimc_saved_items_select_own ON wimc_saved_items FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS wimc_saved_items_insert_own ON wimc_saved_items;
CREATE POLICY wimc_saved_items_insert_own ON wimc_saved_items FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS wimc_saved_items_delete_own ON wimc_saved_items;
CREATE POLICY wimc_saved_items_delete_own ON wimc_saved_items FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS wimc_celebrities_select_all ON wimc_celebrities;
CREATE POLICY wimc_celebrities_select_all ON wimc_celebrities FOR SELECT USING (true);
