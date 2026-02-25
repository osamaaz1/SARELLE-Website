-- =============================================
-- WIMC Test Users — 4 Role-Based Accounts
-- Run AFTER 001_wimc_schema.sql
-- =============================================

-- ── 1. SELLER ────────────────────────────────
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, aud, role
) VALUES (
  '00000000-0000-0000-0000-000000000010',
  'seller@test.wimc.com',
  crypt('Seller123!', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"Sara Seller"}',
  'authenticated', 'authenticated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO wimc_profiles (id, display_name, phone, role, tier, points)
VALUES ('00000000-0000-0000-0000-000000000010', 'Sara Seller', '+20 100 000 0010', 'seller', 'Silver', 1200)
ON CONFLICT (id) DO NOTHING;

INSERT INTO wimc_seller_profiles (user_id, address)
VALUES ('00000000-0000-0000-0000-000000000010', 'Cairo, Egypt')
ON CONFLICT (user_id) DO NOTHING;

-- ── 2. BUYER ─────────────────────────────────
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, aud, role
) VALUES (
  '00000000-0000-0000-0000-000000000020',
  'buyer@test.wimc.com',
  crypt('Buyer123!', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"Bea Buyer"}',
  'authenticated', 'authenticated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO wimc_profiles (id, display_name, phone, role, tier, points)
VALUES ('00000000-0000-0000-0000-000000000020', 'Bea Buyer', '+20 100 000 0020', 'buyer', 'Bronze', 300)
ON CONFLICT (id) DO NOTHING;

-- ── 3. CELEBRITY (VIP Seller) ─────────────────
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, aud, role
) VALUES (
  '00000000-0000-0000-0000-000000000030',
  'celeb@test.wimc.com',
  crypt('Celeb123!', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"Yasmine Sabri"}',
  'authenticated', 'authenticated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO wimc_profiles (id, display_name, phone, role, tier, points)
VALUES ('00000000-0000-0000-0000-000000000030', 'Yasmine Sabri', '+20 100 000 0030', 'vip_seller', 'Gold', 5000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO wimc_vip_profiles (user_id, bio, followers)
VALUES ('00000000-0000-0000-0000-000000000030', 'Actress', '2.1M')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO wimc_seller_profiles (user_id, address)
VALUES ('00000000-0000-0000-0000-000000000030', 'Cairo, Egypt')
ON CONFLICT (user_id) DO NOTHING;

-- ── 4. ADMIN ──────────────────────────────────
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, aud, role
) VALUES (
  '00000000-0000-0000-0000-000000000040',
  'admin@test.wimc.com',
  crypt('Admin123!', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"WIMC Admin"}',
  'authenticated', 'authenticated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO wimc_profiles (id, display_name, phone, role, tier, points)
VALUES ('00000000-0000-0000-0000-000000000040', 'WIMC Admin', '+20 100 000 0040', 'admin', 'Gold', 0)
ON CONFLICT (id) DO NOTHING;

-- ── Verify ────────────────────────────────────
SELECT p.display_name, p.role, p.tier, u.email
FROM wimc_profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.id IN (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000030',
  '00000000-0000-0000-0000-000000000040'
)
ORDER BY p.role;
