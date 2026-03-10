-- =============================================
-- WIMC Complete Seed Data
-- Run AFTER 001_wimc_schema.sql
-- Safe to re-run (cleans up old data first)
-- Creates: 6 users, 4 celebrities, 10 listings,
--          5 submissions, 2 orders, sample offers
-- =============================================

-- =============================================
-- SECTION 0: CLEAN UP OLD WIMC TEST DATA
-- =============================================
DELETE FROM wimc_order_events WHERE order_id IN (SELECT id FROM wimc_orders WHERE buyer_id IN (SELECT id FROM wimc_profiles));
DELETE FROM wimc_notifications WHERE user_id IN (SELECT id FROM wimc_profiles);
DELETE FROM wimc_offers WHERE buyer_id IN (SELECT id FROM wimc_profiles);
DELETE FROM wimc_orders WHERE buyer_id IN (SELECT id FROM wimc_profiles);
DELETE FROM wimc_submission_events WHERE submission_id IN (SELECT id FROM wimc_submissions);
DELETE FROM wimc_submissions WHERE seller_id IN (SELECT id FROM wimc_profiles);
DELETE FROM wimc_saved_items WHERE user_id IN (SELECT id FROM wimc_profiles);
DELETE FROM wimc_payouts WHERE seller_id IN (SELECT id FROM wimc_profiles);
DELETE FROM wimc_listings WHERE seller_id IN (SELECT id FROM wimc_profiles);
DELETE FROM wimc_celebrities WHERE TRUE;
DELETE FROM wimc_vip_profiles WHERE TRUE;
DELETE FROM wimc_seller_profiles WHERE TRUE;
DELETE FROM wimc_idempotency_keys WHERE user_id IN (SELECT id FROM wimc_profiles);
DELETE FROM wimc_profiles WHERE TRUE;

-- Delete old auth users by email (covers old + new IDs)
DELETE FROM auth.users WHERE email IN (
  'admin@whatinmycloset.com', 'admin@test.wimc.com',
  'sara@test.wimc.com', 'seller@test.wimc.com',
  'nadia@test.wimc.com',
  'reem@test.wimc.com',
  'yasmine@test.wimc.com', 'celeb@test.wimc.com',
  'buyer@test.wimc.com',
  'wimc.seller@test.com'
);

-- =============================================
-- SECTION 1: AUTH USERS
-- =============================================

-- 1. Admin
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, aud, role
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@whatinmycloset.com',
  crypt('Admin123!', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"WIMC Admin"}',
  'authenticated', 'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- 2. Sara Ahmed (Seller)
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, aud, role
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  'sara@test.wimc.com',
  crypt('Seller123!', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"Sara Ahmed"}',
  'authenticated', 'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- 3. Nadia El-Sayed (Seller)
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, aud, role
) VALUES (
  '00000000-0000-0000-0000-000000000003',
  'nadia@test.wimc.com',
  crypt('Seller123!', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"Nadia El-Sayed"}',
  'authenticated', 'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- 4. Reem Mostafa (Buyer)
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, aud, role
) VALUES (
  '00000000-0000-0000-0000-000000000004',
  'reem@test.wimc.com',
  crypt('Buyer123!', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"Reem Mostafa"}',
  'authenticated', 'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- 5. Yasmine Sabri (VIP Seller / Celebrity)
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, aud, role
) VALUES (
  '00000000-0000-0000-0000-000000000005',
  'yasmine@test.wimc.com',
  crypt('Celeb123!', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"Yasmine Sabri"}',
  'authenticated', 'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- 6. Bea Buyer (Buyer)
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, aud, role
) VALUES (
  '00000000-0000-0000-0000-000000000006',
  'buyer@test.wimc.com',
  crypt('Buyer123!', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"Bea Buyer"}',
  'authenticated', 'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- =============================================
-- SECTION 2: PROFILES
-- =============================================

INSERT INTO wimc_profiles (id, display_name, phone, role, tier, points) VALUES
  ('00000000-0000-0000-0000-000000000001', 'WIMC Admin',      '+20 100 000 0001', 'admin',      'Gold',    0),
  ('00000000-0000-0000-0000-000000000002', 'Sara Ahmed',       '+20 100 000 0002', 'seller',     'Silver',  1200),
  ('00000000-0000-0000-0000-000000000003', 'Nadia El-Sayed',   '+20 100 000 0003', 'seller',     'Bronze',  350),
  ('00000000-0000-0000-0000-000000000004', 'Reem Mostafa',     '+20 100 000 0004', 'buyer',      'Bronze',  150),
  ('00000000-0000-0000-0000-000000000005', 'Yasmine Sabri',    '+20 100 000 0005', 'vip_seller', 'Platinum', 6000),
  ('00000000-0000-0000-0000-000000000006', 'Bea Buyer',        '+20 100 000 0006', 'buyer',      'Bronze',  50)
ON CONFLICT (id) DO NOTHING;

-- Seller Profiles
INSERT INTO wimc_seller_profiles (user_id, address) VALUES
  ('00000000-0000-0000-0000-000000000002', 'Zamalek, Cairo, Egypt'),
  ('00000000-0000-0000-0000-000000000003', 'Heliopolis, Cairo, Egypt'),
  ('00000000-0000-0000-0000-000000000005', 'New Cairo, Cairo, Egypt')
ON CONFLICT (user_id) DO NOTHING;

-- VIP Profile for Yasmine
INSERT INTO wimc_vip_profiles (user_id, bio, followers)
VALUES ('00000000-0000-0000-0000-000000000005', 'Egyptian actress and fashion icon', '12.5M')
ON CONFLICT (user_id) DO NOTHING;

-- =============================================
-- SECTION 3: CELEBRITIES
-- =============================================

INSERT INTO wimc_celebrities (id, user_id, name, bio, followers, verified) VALUES
  ('00000000-0000-0000-0000-100000000001', '00000000-0000-0000-0000-000000000005', 'Yasmine Sabri', 'Actress & Fashion Icon', '12.5M', true),
  ('00000000-0000-0000-0000-100000000002', NULL, 'Mohamed Ramadan', 'Actor & Singer', '8.3M', true),
  ('00000000-0000-0000-0000-100000000003', NULL, 'Hend Sabry', 'Award-Winning Actress', '5.7M', true),
  ('00000000-0000-0000-0000-100000000004', NULL, 'Amr Diab', 'Legendary Singer', '15.2M', true)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- SECTION 4: LISTINGS (10 luxury items)
-- =============================================

INSERT INTO wimc_listings
  (id, seller_id, brand, name, category, condition, price, original_price, description, photos, status, featured, celebrity_id)
VALUES

-- 1. Hermès Birkin 30 (Featured, by Yasmine Sabri)
(
  '00000000-0000-0000-0000-200000000001',
  '00000000-0000-0000-0000-000000000005',
  'Hermès',
  'Birkin 30 Togo Leather',
  'Bags',
  'Excellent',
  45000, 52000,
  'Iconic Birkin 30 in Toffee Togo leather with Palladium hardware. Stamp T (2015). Comes with lock, keys, clochette, raincoat, and dust bag. Authenticated by WIMC.',
  ARRAY['https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&h=800&fit=crop','https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=800&fit=crop'],
  'published', true,
  '00000000-0000-0000-0000-100000000001'
),

-- 2. Chanel Classic Flap (Featured, by Sara)
(
  '00000000-0000-0000-0000-200000000002',
  '00000000-0000-0000-0000-000000000002',
  'Chanel',
  'Classic Flap Medium Caviar',
  'Bags',
  'Like New',
  22500, NULL,
  'Medium Classic Flap in black caviar leather with gold hardware. Series 28. Barely used — comes with full set including receipt, authenticity card, and original box.',
  ARRAY['https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=600&h=800&fit=crop','https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&h=800&fit=crop'],
  'published', true,
  NULL
),

-- 3. Louis Vuitton Neverfull MM (Featured, by Sara)
(
  '00000000-0000-0000-0000-200000000003',
  '00000000-0000-0000-0000-000000000002',
  'Louis Vuitton',
  'Neverfull MM Damier Ebene',
  'Bags',
  'Very Good',
  1650, 2030,
  'Classic Neverfull MM in Damier Ebene canvas with cherry interior. Date code SD4189. Includes pochette. Light wear on handles. Authenticated by WIMC.',
  ARRAY['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=800&fit=crop','https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600&h=800&fit=crop'],
  'published', true,
  NULL
),

-- 4. Rolex Datejust 36 (Featured, by Nadia)
(
  '00000000-0000-0000-0000-200000000004',
  '00000000-0000-0000-0000-000000000003',
  'Rolex',
  'Datejust 36 Silver Dial',
  'Watches',
  'Excellent',
  18500, 21000,
  'Rolex Datejust 36mm in Oystersteel with silver Roman numeral dial and fluted bezel. Reference 126234. 2021 with box and papers. Full service history.',
  ARRAY['https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=600&h=800&fit=crop','https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600&h=800&fit=crop'],
  'published', true,
  NULL
),

-- 5. Louboutin So Kate (by Sara)
(
  '00000000-0000-0000-0000-200000000005',
  '00000000-0000-0000-0000-000000000002',
  'Louboutin',
  'So Kate 120mm Patent Leather',
  'Shoes',
  'Very Good',
  750, 1050,
  'The iconic So Kate pump in black patent leather. 120mm heel. Size EU 38. Worn twice for photoshoots — soles are near perfect. Signature red outsole.',
  ARRAY['https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&h=800&fit=crop','https://images.unsplash.com/photo-1515347619252-60a4bf4fff4f?w=600&h=800&fit=crop'],
  'published', false,
  NULL
),

-- 6. Gucci Marmont (by Yasmine, celebrity item)
(
  '00000000-0000-0000-0000-200000000006',
  '00000000-0000-0000-0000-000000000005',
  'Gucci',
  'GG Marmont Small Shoulder Bag',
  'Bags',
  'Like New',
  2200, NULL,
  'Small GG Marmont shoulder bag in black matelassé chevron leather. Gold-tone Double G hardware. From Yasmine Sabri''s personal collection.',
  ARRAY['https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600&h=800&fit=crop','https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&h=800&fit=crop'],
  'published', false,
  '00000000-0000-0000-0000-100000000001'
),

-- 7. Cartier Love Bracelet (Featured, by Nadia)
(
  '00000000-0000-0000-0000-200000000007',
  '00000000-0000-0000-0000-000000000003',
  'Cartier',
  'Love Bracelet 18K Yellow Gold',
  'Jewellery',
  'Excellent',
  8500, 9800,
  '18K yellow gold Love bracelet with 4 diamonds. Size 17. Purchased 2020 with original box, receipt, and screwdriver. Hallmarked and authenticated.',
  ARRAY['https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&h=800&fit=crop','https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&h=800&fit=crop'],
  'published', true,
  NULL
),

-- 8. Dior Lady Dior (by Sara)
(
  '00000000-0000-0000-0000-200000000008',
  '00000000-0000-0000-0000-000000000002',
  'Dior',
  'Lady Dior Medium Cannage',
  'Bags',
  'Very Good',
  5800, 7200,
  'Lady Dior medium in blush pink lambskin with light gold hardware. The iconic cannage quilting. Comes with all charms, dust bag, and authenticity certificate.',
  ARRAY['https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=600&h=800&fit=crop','https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=800&fit=crop'],
  'published', false,
  NULL
),

-- 9. Valentino Rockstud (by Nadia)
(
  '00000000-0000-0000-0000-200000000009',
  '00000000-0000-0000-0000-000000000003',
  'Valentino',
  'Garavani Rockstud Pumps 100mm',
  'Shoes',
  'Good',
  620, 1100,
  'Iconic Rockstud pump in nude leather with signature pyramid studs. 100mm heel. Size EU 37.5. Light wear on soles, uppers excellent.',
  ARRAY['https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&h=800&fit=crop','https://images.unsplash.com/photo-1515347619252-60a4bf4fff4f?w=600&h=800&fit=crop'],
  'published', false,
  NULL
),

-- 10. Prada Re-Edition (Featured, by Yasmine, celebrity item)
(
  '00000000-0000-0000-0000-200000000010',
  '00000000-0000-0000-0000-000000000005',
  'Prada',
  'Re-Edition 2005 Nylon Shoulder Bag',
  'Bags',
  'Like New',
  1450, NULL,
  'The iconic Re-Edition 2005 bag in black Re-Nylon fabric. Triangular Prada logo plaque. From Yasmine Sabri''s closet. Pristine condition.',
  ARRAY['https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600&h=800&fit=crop','https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=800&fit=crop'],
  'published', true,
  '00000000-0000-0000-0000-100000000001'
)

ON CONFLICT (id) DO NOTHING;

-- =============================================
-- SECTION 5: SUBMISSIONS (various stages)
-- =============================================

-- Submission 1: pending_review (Sara submits a YSL bag)
INSERT INTO wimc_submissions (id, seller_id, brand, name, category, condition, description, user_photos, stage)
VALUES (
  '00000000-0000-0000-0000-300000000001',
  '00000000-0000-0000-0000-000000000002',
  'Saint Laurent', 'Loulou Medium', 'Bags', 'Very Good',
  'YSL Loulou medium in black Y-quilted leather. Gold hardware. Minor corner wear.',
  ARRAY['https://picsum.photos/seed/ysl1/600/800'],
  'pending_review'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO wimc_submission_events (submission_id, actor_id, message, old_stage, new_stage)
VALUES ('00000000-0000-0000-0000-300000000001', '00000000-0000-0000-0000-000000000002', 'Submission created', NULL, 'pending_review');

-- Submission 2: pending_review (Nadia submits Omega watch)
INSERT INTO wimc_submissions (id, seller_id, brand, name, category, condition, description, user_photos, stage)
VALUES (
  '00000000-0000-0000-0000-300000000002',
  '00000000-0000-0000-0000-000000000003',
  'Omega', 'Seamaster Aqua Terra', 'Watches', 'Excellent',
  'Omega Seamaster Aqua Terra 38mm. Silver dial, steel bracelet. 2022 with full box and papers.',
  ARRAY['https://picsum.photos/seed/omega1/600/800'],
  'pending_review'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO wimc_submission_events (submission_id, actor_id, message, old_stage, new_stage)
VALUES ('00000000-0000-0000-0000-300000000002', '00000000-0000-0000-0000-000000000003', 'Submission created', NULL, 'pending_review');

-- Submission 3: pickup_scheduled (Sara submits Fendi bag, admin approved & scheduled)
INSERT INTO wimc_submissions (id, seller_id, brand, name, category, condition, description, user_photos, stage, proposed_price, pickup_date, pickup_time, pickup_address, driver_phone)
VALUES (
  '00000000-0000-0000-0000-300000000003',
  '00000000-0000-0000-0000-000000000002',
  'Fendi', 'Peekaboo ISeeU Medium', 'Bags', 'Like New',
  'Fendi Peekaboo ISeeU medium in cuoio romano leather. Comes with strap and dust bag.',
  ARRAY['https://picsum.photos/seed/fendi1/600/800'],
  'pickup_scheduled',
  4200,
  CURRENT_DATE + INTERVAL '2 days',
  '10:00 AM - 12:00 PM',
  'Zamalek, Cairo',
  '+20 100 555 0001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO wimc_submission_events (submission_id, actor_id, message, old_stage, new_stage) VALUES
  ('00000000-0000-0000-0000-300000000003', '00000000-0000-0000-0000-000000000002', 'Submission created', NULL, 'pending_review'),
  ('00000000-0000-0000-0000-300000000003', '00000000-0000-0000-0000-000000000001', 'Price proposed: $4200', 'pending_review', 'price_suggested'),
  ('00000000-0000-0000-0000-300000000003', '00000000-0000-0000-0000-000000000002', 'Seller accepted proposed price', 'price_suggested', 'price_accepted'),
  ('00000000-0000-0000-0000-300000000003', '00000000-0000-0000-0000-000000000001', 'Pickup scheduled', 'price_accepted', 'pickup_scheduled');

-- Submission 4: arrived_at_office (Nadia submits Bulgari necklace)
INSERT INTO wimc_submissions (id, seller_id, brand, name, category, condition, description, user_photos, stage, proposed_price)
VALUES (
  '00000000-0000-0000-0000-300000000004',
  '00000000-0000-0000-0000-000000000003',
  'Bulgari', 'Serpenti Viper Necklace', 'Jewellery', 'Excellent',
  'Bulgari Serpenti Viper necklace in 18K rose gold with pavé diamonds. Stunning piece.',
  ARRAY['https://picsum.photos/seed/bulgari1/600/800'],
  'arrived_at_office',
  12000
) ON CONFLICT (id) DO NOTHING;

INSERT INTO wimc_submission_events (submission_id, actor_id, message, old_stage, new_stage) VALUES
  ('00000000-0000-0000-0000-300000000004', '00000000-0000-0000-0000-000000000003', 'Submission created', NULL, 'pending_review'),
  ('00000000-0000-0000-0000-300000000004', '00000000-0000-0000-0000-000000000001', 'Price proposed: $12000', 'pending_review', 'price_suggested'),
  ('00000000-0000-0000-0000-300000000004', '00000000-0000-0000-0000-000000000003', 'Seller accepted proposed price', 'price_suggested', 'price_accepted'),
  ('00000000-0000-0000-0000-300000000004', '00000000-0000-0000-0000-000000000001', 'Pickup scheduled', 'price_accepted', 'pickup_scheduled'),
  ('00000000-0000-0000-0000-300000000004', '00000000-0000-0000-0000-000000000001', 'Driver dispatched', 'pickup_scheduled', 'driver_dispatched'),
  ('00000000-0000-0000-0000-300000000004', '00000000-0000-0000-0000-000000000001', 'Item arrived at office', 'driver_dispatched', 'arrived_at_office');

-- Submission 5: auth_passed (Sara submits Bottega Veneta)
INSERT INTO wimc_submissions (id, seller_id, brand, name, category, condition, description, user_photos, stage, proposed_price)
VALUES (
  '00000000-0000-0000-0000-300000000005',
  '00000000-0000-0000-0000-000000000002',
  'Bottega Veneta', 'Cassette Bag Intrecciato', 'Bags', 'Like New',
  'Bottega Veneta Cassette bag in thunder intrecciato leather. Padded weave. Immaculate condition.',
  ARRAY['https://picsum.photos/seed/bottega1/600/800'],
  'auth_passed',
  3500
) ON CONFLICT (id) DO NOTHING;

INSERT INTO wimc_submission_events (submission_id, actor_id, message, old_stage, new_stage) VALUES
  ('00000000-0000-0000-0000-300000000005', '00000000-0000-0000-0000-000000000002', 'Submission created', NULL, 'pending_review'),
  ('00000000-0000-0000-0000-300000000005', '00000000-0000-0000-0000-000000000001', 'Price proposed: $3500', 'pending_review', 'price_suggested'),
  ('00000000-0000-0000-0000-300000000005', '00000000-0000-0000-0000-000000000002', 'Seller accepted proposed price', 'price_suggested', 'price_accepted'),
  ('00000000-0000-0000-0000-300000000005', '00000000-0000-0000-0000-000000000001', 'Pickup scheduled', 'price_accepted', 'pickup_scheduled'),
  ('00000000-0000-0000-0000-300000000005', '00000000-0000-0000-0000-000000000001', 'Driver dispatched', 'pickup_scheduled', 'driver_dispatched'),
  ('00000000-0000-0000-0000-300000000005', '00000000-0000-0000-0000-000000000001', 'Item arrived at office', 'driver_dispatched', 'arrived_at_office'),
  ('00000000-0000-0000-0000-300000000005', '00000000-0000-0000-0000-000000000001', 'Authentication passed', 'arrived_at_office', 'auth_passed');

-- =============================================
-- SECTION 6: OFFERS
-- =============================================

-- Reem offers on the Chanel
INSERT INTO wimc_offers (id, listing_id, buyer_id, amount, status)
VALUES (
  '00000000-0000-0000-0000-400000000001',
  '00000000-0000-0000-0000-200000000002',
  '00000000-0000-0000-0000-000000000004',
  20000, 'pending'
) ON CONFLICT (id) DO NOTHING;

-- Bea offers on the Dior
INSERT INTO wimc_offers (id, listing_id, buyer_id, amount, status)
VALUES (
  '00000000-0000-0000-0000-400000000002',
  '00000000-0000-0000-0000-200000000008',
  '00000000-0000-0000-0000-000000000006',
  5200, 'pending'
) ON CONFLICT (id) DO NOTHING;

-- =============================================
-- SECTION 7: ORDERS
-- =============================================

-- Order 1: Reem bought the Valentino Rockstud (paid)
INSERT INTO wimc_orders (id, listing_id, buyer_id, seller_id, item_price, service_fee, shipping_fee, total, status, shipping_address)
VALUES (
  '00000000-0000-0000-0000-500000000001',
  '00000000-0000-0000-0000-200000000009',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000003',
  620, 124, 50, 794,
  'paid',
  '{"name":"Reem Mostafa","address":"15 Tahrir St","city":"Cairo","phone":"+20 100 000 0004"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Mark the Valentino as sold
UPDATE wimc_listings SET status = 'sold' WHERE id = '00000000-0000-0000-0000-200000000009';

INSERT INTO wimc_order_events (order_id, from_status, to_status, changed_by)
VALUES
  ('00000000-0000-0000-0000-500000000001', NULL, 'pending_payment', '00000000-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-500000000001', 'pending_payment', 'paid', '00000000-0000-0000-0000-000000000004');

-- Order 2: Bea bought the Louboutin (shipped)
INSERT INTO wimc_orders (id, listing_id, buyer_id, seller_id, item_price, service_fee, shipping_fee, total, status, tracking_number, shipped_at, shipping_address)
VALUES (
  '00000000-0000-0000-0000-500000000002',
  '00000000-0000-0000-0000-200000000005',
  '00000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000002',
  750, 150, 50, 950,
  'shipped',
  'WIMC-TRK-20240315-001',
  NOW() - INTERVAL '1 day',
  '{"name":"Bea Buyer","address":"22 Maadi Ring Rd","city":"Cairo","phone":"+20 100 000 0006"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Mark the Louboutin as sold
UPDATE wimc_listings SET status = 'sold' WHERE id = '00000000-0000-0000-0000-200000000005';

INSERT INTO wimc_order_events (order_id, from_status, to_status, changed_by)
VALUES
  ('00000000-0000-0000-0000-500000000002', NULL, 'pending_payment', '00000000-0000-0000-0000-000000000006'),
  ('00000000-0000-0000-0000-500000000002', 'pending_payment', 'paid', '00000000-0000-0000-0000-000000000006'),
  ('00000000-0000-0000-0000-500000000002', 'paid', 'processing', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-500000000002', 'processing', 'shipped', '00000000-0000-0000-0000-000000000001');

-- =============================================
-- SECTION 8: SAMPLE NOTIFICATIONS
-- =============================================

INSERT INTO wimc_notifications (user_id, type, title, message, read, action_url) VALUES
  ('00000000-0000-0000-0000-000000000002', 'offer_received', 'New Offer', 'Reem Mostafa offered $20,000 on your Chanel Classic Flap', false, '/seller/submissions'),
  ('00000000-0000-0000-0000-000000000002', 'submission_listed', 'Item Listed', 'Your Chanel Classic Flap is now live on the marketplace', true, '/listing/00000000-0000-0000-0000-200000000002'),
  ('00000000-0000-0000-0000-000000000004', 'order_shipped', 'Order Shipped', 'Your Valentino Rockstud Pumps order has been shipped', false, '/orders/00000000-0000-0000-0000-500000000001'),
  ('00000000-0000-0000-0000-000000000006', 'order_shipped', 'Order Shipped', 'Your Louboutin So Kate order is on its way! Tracking: WIMC-TRK-20240315-001', false, '/orders/00000000-0000-0000-0000-500000000002');

-- =============================================
-- VERIFY
-- =============================================
SELECT 'profiles' AS table_name, COUNT(*) AS count FROM wimc_profiles
UNION ALL SELECT 'celebrities', COUNT(*) FROM wimc_celebrities
UNION ALL SELECT 'listings', COUNT(*) FROM wimc_listings
UNION ALL SELECT 'submissions', COUNT(*) FROM wimc_submissions
UNION ALL SELECT 'offers', COUNT(*) FROM wimc_offers
UNION ALL SELECT 'orders', COUNT(*) FROM wimc_orders
UNION ALL SELECT 'notifications', COUNT(*) FROM wimc_notifications;
