-- =============================================
-- WIMC Test Seed Data — 10 Luxury Items
-- Run this in Supabase SQL Editor AFTER running 001_wimc_schema.sql
-- =============================================

-- Step 1: Create a test seller user in auth
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  aud, role
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'sarelle.seller@test.com',
  crypt('Password123!', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"Sarelle Closet"}',
  'authenticated', 'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create the seller profile
INSERT INTO wimc_profiles (id, display_name, phone, role, tier, points)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Sarelle Closet',
  '+20 100 000 0001',
  'vip_seller',
  'Gold',
  2500
)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Insert 10 luxury listings
-- Photos are from Unsplash (free to use, direct CDN links)

INSERT INTO wimc_listings
  (seller_id, brand, name, category, condition, price, original_price, description, photos, status, featured)
VALUES

-- 1. Hermès Birkin 30 — Toffee Togo Leather
(
  '00000000-0000-0000-0000-000000000001',
  'Hermès',
  'Birkin 30 Togo Leather',
  'Bags',
  'Excellent',
  45000,
  52000,
  'Iconic Birkin 30 in Toffee Togo leather with Palladium hardware. Stamp T (2015). Comes with lock, keys, clochette, raincoat, and dust bag. Authenticated by WIMC.',
  ARRAY['https://picsum.photos/seed/hermes1/600/800','https://picsum.photos/seed/hermes2/600/800'],
  'published', true
),

-- 2. Chanel Classic Flap — Black Caviar
(
  '00000000-0000-0000-0000-000000000001',
  'Chanel',
  'Classic Flap Medium Caviar',
  'Bags',
  'Like New',
  22500,
  NULL,
  'Medium Classic Flap in black caviar leather with gold hardware. Series 28. Barely used — comes with full set including receipt, authenticity card, and original box.',
  ARRAY['https://picsum.photos/seed/chanel1/600/800','https://picsum.photos/seed/chanel2/600/800'],
  'published', true
),

-- 3. Louis Vuitton Speedy 25 — Monogram
(
  '00000000-0000-0000-0000-000000000001',
  'Louis Vuitton',
  'Speedy 25 Monogram',
  'Bags',
  'Very Good',
  3800,
  4800,
  'Classic Speedy 25 in LV Monogram canvas with natural vachetta leather handles. Light honey patina. Date code CA3161. Comes with dust bag and padlock.',
  ARRAY['https://picsum.photos/seed/lv1/600/800','https://picsum.photos/seed/lv2/600/800'],
  'published', true
),

-- 4. Rolex Datejust 36 — Silver Dial
(
  '00000000-0000-0000-0000-000000000001',
  'Rolex',
  'Datejust 36 Silver Dial',
  'Watches',
  'Excellent',
  18500,
  21000,
  'Rolex Datejust 36mm in Oystersteel with silver Roman numeral dial and fluted bezel. Reference 126234. 2021 with box and papers. Full service history.',
  ARRAY['https://picsum.photos/seed/rolex1/600/800','https://picsum.photos/seed/rolex2/600/800'],
  'published', true
),

-- 5. Christian Louboutin So Kate 120 — Classic Black
(
  '00000000-0000-0000-0000-000000000001',
  'Louboutin',
  'So Kate 120mm Patent Leather',
  'Shoes',
  'Very Good',
  750,
  1050,
  'The iconic So Kate pump in black patent leather. 120mm heel. Size EU 38. Worn twice for photoshoots — soles are near perfect. Signature red outsole.',
  ARRAY['https://picsum.photos/seed/loub1/600/800','https://picsum.photos/seed/loub2/600/800'],
  'published', false
),

-- 6. Gucci GG Marmont Small Shoulder Bag — Black Matelassé
(
  '00000000-0000-0000-0000-000000000001',
  'Gucci',
  'GG Marmont Small Shoulder Bag',
  'Bags',
  'Like New',
  2200,
  NULL,
  'Small GG Marmont shoulder bag in black matelassé chevron leather. Gold-tone Double G hardware. Comes with original dust bag, authenticity card, and Gucci box.',
  ARRAY['https://picsum.photos/seed/gucci1/600/800','https://picsum.photos/seed/gucci2/600/800'],
  'published', false
),

-- 7. Cartier Love Bracelet — Yellow Gold
(
  '00000000-0000-0000-0000-000000000001',
  'Cartier',
  'Love Bracelet 18K Yellow Gold',
  'Jewellery',
  'Excellent',
  8500,
  9800,
  '18K yellow gold Love bracelet with 4 diamonds. Size 17. Purchased 2020 with original box, receipt, and screwdriver. Hallmarked and authenticated.',
  ARRAY['https://picsum.photos/seed/cartier1/600/800','https://picsum.photos/seed/cartier2/600/800'],
  'published', true
),

-- 8. Dior Lady Dior Medium — Blush Pink
(
  '00000000-0000-0000-0000-000000000001',
  'Dior',
  'Lady Dior Medium Cannage',
  'Bags',
  'Very Good',
  5800,
  7200,
  'Lady Dior medium in blush pink lambskin with light gold hardware. The iconic cannage quilting. Comes with all charms, dust bag, and authenticity certificate.',
  ARRAY['https://picsum.photos/seed/dior1/600/800','https://picsum.photos/seed/dior2/600/800'],
  'published', false
),

-- 9. Valentino Garavani Rockstud Pumps — Nude
(
  '00000000-0000-0000-0000-000000000001',
  'Valentino',
  'Garavani Rockstud Pumps 100mm',
  'Shoes',
  'Good',
  620,
  1100,
  'Iconic Rockstud pump in nude leather with signature pyramid studs. 100mm heel. Size EU 37.5. Light wear on soles, uppers excellent. Comes with box and dust bag.',
  ARRAY['https://picsum.photos/seed/valentino1/600/800','https://picsum.photos/seed/valentino2/600/800'],
  'published', false
),

-- 10. Prada Re-Edition 2005 — Black Nylon
(
  '00000000-0000-0000-0000-000000000001',
  'Prada',
  'Re-Edition 2005 Nylon Shoulder Bag',
  'Bags',
  'Like New',
  1450,
  NULL,
  'The iconic Re-Edition 2005 bag in black Re-Nylon fabric. Triangular Prada logo plaque. Adjustable strap. Worn once — pristine condition with original dust bag and box.',
  ARRAY['https://picsum.photos/seed/prada1/600/800','https://picsum.photos/seed/prada2/600/800'],
  'published', false
);

-- Verify the inserted data
SELECT brand, name, category, condition, price, original_price, featured
FROM wimc_listings
ORDER BY created_at DESC
LIMIT 10;
