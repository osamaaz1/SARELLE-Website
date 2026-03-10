/**
 * Creates WIMC test accounts via Supabase Auth API (proper way)
 * then seeds wimc_profiles + all related data.
 *
 * Usage: node seed-accounts.js
 */
require('dotenv/config');
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const ACCOUNTS = [
  { email: 'admin@whatinmycloset.com', password: 'Admin123!', display_name: 'WIMC Admin', role: 'admin', tier: 'Gold', points: 2000 },
  { email: 'sara@test.wimc.com', password: 'Seller123!', display_name: 'Sara Ahmed', role: 'seller', tier: 'Silver', points: 750 },
  { email: 'nadia@test.wimc.com', password: 'Seller123!', display_name: 'Nadia El-Sayed', role: 'seller', tier: 'Bronze', points: 100 },
  { email: 'reem@test.wimc.com', password: 'Buyer123!', display_name: 'Reem Mostafa', role: 'buyer', tier: 'Bronze', points: 50 },
  { email: 'yasmine@test.wimc.com', password: 'Celeb123!', display_name: 'Yasmine Sabri', role: 'vip_seller', tier: 'Platinum', points: 8000 },
  { email: 'buyer@test.wimc.com', password: 'Buyer123!', display_name: 'Bea Buyer', role: 'buyer', tier: 'Bronze', points: 0 },
];

async function main() {
  console.log('=== WIMC Account & Data Seeder ===\n');

  // Step 1: Create auth users via API
  const userIds = {};
  for (const acc of ACCOUNTS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: acc.email,
      password: acc.password,
      email_confirm: true,
    });
    if (error) {
      console.log('FAIL: ' + acc.email + ' -> ' + error.message);
      process.exit(1);
    }
    userIds[acc.email] = data.user.id;
    console.log('AUTH OK: ' + acc.email + ' -> ' + data.user.id.substring(0, 8) + '...');
  }

  // Step 2: Insert profiles and all seed data via direct SQL
  const pg = new Client({
    host: process.env.SUPABASE_DB_HOST,
    port: parseInt(process.env.SUPABASE_DB_PORT || '5432'),
    user: process.env.SUPABASE_DB_USER,
    password: process.env.SUPABASE_DB_PASS,
    database: process.env.SUPABASE_DB_NAME || 'postgres',
    ssl: { rejectUnauthorized: false },
  });
  await pg.connect();
  console.log('\nDB connected. Seeding data...\n');

  const adminId = userIds['admin@whatinmycloset.com'];
  const saraId = userIds['sara@test.wimc.com'];
  const nadiaId = userIds['nadia@test.wimc.com'];
  const reemId = userIds['reem@test.wimc.com'];
  const yasmineId = userIds['yasmine@test.wimc.com'];
  const buyerId = userIds['buyer@test.wimc.com'];

  // Profiles
  for (const acc of ACCOUNTS) {
    await pg.query(
      `INSERT INTO wimc_profiles (id, display_name, role, points, tier) VALUES ($1, $2, $3::wimc_role, $4, $5)`,
      [userIds[acc.email], acc.display_name, acc.role, acc.points, acc.tier]
    );
    console.log('PROFILE: ' + acc.display_name);
  }

  // Seller profiles
  for (const email of ['sara@test.wimc.com', 'nadia@test.wimc.com', 'yasmine@test.wimc.com']) {
    await pg.query(
      `INSERT INTO wimc_seller_profiles (user_id, address, payout_method) VALUES ($1, $2, $3)`,
      [userIds[email], 'Cairo, Egypt', JSON.stringify({ type: 'bank_transfer', bank: 'CIB' })]
    );
  }
  console.log('SELLER PROFILES: 3');

  // VIP profile for Yasmine
  await pg.query(
    `INSERT INTO wimc_vip_profiles (user_id, bio, followers, approved_by, approved_at) VALUES ($1, $2, $3, $4, NOW())`,
    [yasmineId, 'Egyptian actress and fashion icon', '72M', adminId]
  );
  console.log('VIP PROFILE: Yasmine Sabri');

  // Celebrities
  const celebs = [
    { name: 'Yasmine Sabri', bio: 'Egyptian actress and fashion icon', followers: '72M', user_id: yasmineId, verified: true },
    { name: 'Mohamed Ramadan', bio: 'Egyptian actor and singer', followers: '65M', user_id: null, verified: true },
    { name: 'Hend Sabry', bio: 'Tunisian-Egyptian actress', followers: '18M', user_id: null, verified: true },
    { name: 'Amr Diab', bio: 'The Father of Mediterranean Music', followers: '35M', user_id: null, verified: true },
  ];
  const celebIds = [];
  for (const c of celebs) {
    const { rows } = await pg.query(
      `INSERT INTO wimc_celebrities (name, bio, followers, user_id, verified, avatar_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [c.name, c.bio, c.followers, c.user_id, c.verified, null]
    );
    celebIds.push({ name: c.name, id: rows[0].id });
    console.log('CELEBRITY: ' + c.name);
  }

  const yasCelebId = celebIds.find(c => c.name === 'Yasmine Sabri').id;
  const moRaCelebId = celebIds.find(c => c.name === 'Mohamed Ramadan').id;

  // Listings (10 items)
  const listings = [
    { seller_id: saraId, brand: 'Hermès', name: 'Birkin 30 Togo Leather', category: 'Bags', condition: 'Excellent', price: 45000, original_price: 52000, featured: true, celebrity_id: yasCelebId, listing_type: 'auction' },
    { seller_id: saraId, brand: 'Chanel', name: 'Classic Flap Medium Caviar', category: 'Bags', condition: 'Like New', price: 22500, original_price: null, featured: true, celebrity_id: yasCelebId, listing_type: 'auction' },
    { seller_id: nadiaId, brand: 'Louis Vuitton', name: 'Speedy 25 Monogram', category: 'Bags', condition: 'Good', price: 1650, original_price: 2100, featured: false, celebrity_id: null, listing_type: 'fixed_price' },
    { seller_id: saraId, brand: 'Rolex', name: 'Datejust 36 Silver Dial', category: 'Watches', condition: 'Excellent', price: 18500, original_price: 24000, featured: true, celebrity_id: moRaCelebId, listing_type: 'auction' },
    { seller_id: nadiaId, brand: 'Christian Louboutin', name: 'So Kate 120 Patent', category: 'Shoes', condition: 'Good', price: 750, original_price: 1100, featured: false, celebrity_id: null, listing_type: 'fixed_price' },
    { seller_id: saraId, brand: 'Gucci', name: 'GG Marmont Small Shoulder', category: 'Bags', condition: 'Like New', price: 2200, original_price: 2800, featured: false, celebrity_id: null, listing_type: 'fixed_price' },
    { seller_id: yasmineId, brand: 'Cartier', name: 'Love Bracelet 18K Yellow Gold', category: 'Jewellery', condition: 'Excellent', price: 8500, original_price: 10500, featured: true, celebrity_id: yasCelebId, listing_type: 'auction' },
    { seller_id: yasmineId, brand: 'Dior', name: 'Lady Dior Medium Cannage', category: 'Bags', condition: 'Like New', price: 5800, original_price: 7200, featured: true, celebrity_id: null, listing_type: 'fixed_price' },
    { seller_id: nadiaId, brand: 'Valentino', name: 'Rockstud Pump 100', category: 'Shoes', condition: 'Good', price: 620, original_price: 950, featured: false, celebrity_id: null, listing_type: 'fixed_price' },
    { seller_id: saraId, brand: 'Prada', name: 'Re-Edition 2005 Nylon', category: 'Bags', condition: 'Excellent', price: 1450, original_price: 1850, featured: false, celebrity_id: null, listing_type: 'fixed_price' },
  ];

  const listingIds = [];
  for (const l of listings) {
    const { rows } = await pg.query(
      `INSERT INTO wimc_listings (seller_id, brand, name, category, condition, price, original_price, featured, celebrity_id, status, listing_type, description, photos)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'published', $10, $11, $12) RETURNING id`,
      [l.seller_id, l.brand, l.name, l.category, l.condition, l.price, l.original_price, l.featured, l.celebrity_id, l.listing_type,
       l.brand + ' ' + l.name + ' in ' + l.condition + ' condition. Authenticated by WIMC.',
       ['https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&h=800&fit=crop']]
    );
    listingIds.push({ name: l.brand + ' ' + l.name, id: rows[0].id, listing_type: l.listing_type, price: l.price, celebrity_id: l.celebrity_id });
    console.log('LISTING: ' + l.brand + ' ' + l.name + ' (' + l.listing_type + ')');
  }

  // Auctions for auction-type listings
  const auctionListings = listingIds.filter(l => l.listing_type === 'auction');
  for (const l of auctionListings) {
    const startsAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const endsAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const reservePrice = l.celebrity_id ? l.price * 1.1 : null;
    await pg.query(
      `INSERT INTO wimc_auctions (id, listing_id, starting_price, reserve_price, reserve_met, current_price, current_winner_id, status, starts_at, ends_at, bid_count)
       VALUES (gen_random_uuid(), $1, $2, $3, false, $2, NULL, 'active', $4, $5, 0)`,
      [l.id, l.price, reservePrice, startsAt, endsAt]
    );
    console.log('AUCTION: ' + l.name);
  }

  // Submissions (5 in various stages)
  const submissions = [
    { seller_id: saraId, brand: 'Fendi', name: 'Peekaboo ISeeU Medium', category: 'Bags', condition: 'Good', stage: 'pending_review' },
    { seller_id: nadiaId, brand: 'Balenciaga', name: 'City Bag Classic', category: 'Bags', condition: 'Like New', stage: 'pending_review' },
    { seller_id: saraId, brand: 'Omega', name: 'Seamaster Aqua Terra', category: 'Watches', condition: 'Excellent', stage: 'price_suggested', proposed_price: 6500 },
    { seller_id: nadiaId, brand: 'Celine', name: 'Luggage Nano', category: 'Bags', condition: 'Good', stage: 'pickup_scheduled' },
    { seller_id: yasmineId, brand: 'Van Cleef & Arpels', name: 'Alhambra Pendant', category: 'Jewellery', condition: 'Like New', stage: 'arrived_at_office' },
  ];

  for (const s of submissions) {
    const { rows } = await pg.query(
      `INSERT INTO wimc_submissions (seller_id, brand, name, category, condition, description, stage, proposed_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7::wimc_submission_stage, $8) RETURNING id`,
      [s.seller_id, s.brand, s.name, s.category, s.condition, s.brand + ' ' + s.name + ' - ' + s.condition, s.stage, s.proposed_price || null]
    );
    // Add event
    await pg.query(
      `INSERT INTO wimc_submission_events (submission_id, actor_id, message, old_stage, new_stage) VALUES ($1, $2, $3, NULL, $4::wimc_submission_stage)`,
      [rows[0].id, s.seller_id, 'Submission created', 'pending_review']
    );
    console.log('SUBMISSION: ' + s.brand + ' ' + s.name + ' (' + s.stage + ')');
  }

  // Orders (2)
  const fixedListings = listingIds.filter(l => l.listing_type === 'fixed_price');
  if (fixedListings.length >= 2) {
    const order1 = await pg.query(
      `INSERT INTO wimc_orders (listing_id, buyer_id, seller_id, item_price, service_fee, shipping_fee, total, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'paid'::wimc_order_status) RETURNING id`,
      [fixedListings[0].id, reemId, nadiaId, fixedListings[0].price, fixedListings[0].price * 0.05, 50, fixedListings[0].price * 1.05 + 50]
    );
    console.log('ORDER 1: ' + fixedListings[0].name + ' (paid)');

    const order2 = await pg.query(
      `INSERT INTO wimc_orders (listing_id, buyer_id, seller_id, item_price, service_fee, shipping_fee, total, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'shipped'::wimc_order_status) RETURNING id`,
      [fixedListings[1].id, buyerId, saraId, fixedListings[1].price, fixedListings[1].price * 0.05, 50, fixedListings[1].price * 1.05 + 50]
    );
    console.log('ORDER 2: ' + fixedListings[1].name + ' (shipped)');
  }

  // Notifications
  await pg.query(
    `INSERT INTO wimc_notifications (user_id, type, title, message) VALUES ($1, 'info', 'Welcome to WIMC!', 'Start browsing luxury items.')`,
    [reemId]
  );
  await pg.query(
    `INSERT INTO wimc_notifications (user_id, type, title, message) VALUES ($1, 'info', 'Welcome to WIMC!', 'Start listing your items.')`,
    [saraId]
  );
  console.log('NOTIFICATIONS: 2');

  await pg.end();

  // Verify login works
  console.log('\n=== Testing Login ===');
  const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: 'admin@whatinmycloset.com',
    password: 'Admin123!',
  });
  if (loginErr) {
    console.log('LOGIN FAIL: ' + loginErr.message);
  } else {
    console.log('LOGIN OK: admin@whatinmycloset.com (token: ' + loginData.session.access_token.substring(0, 20) + '...)');
  }

  console.log('\n=== All Done! ===');
  console.log('Test accounts:');
  ACCOUNTS.forEach(a => console.log('  ' + a.email + ' / ' + a.password + ' (' + a.role + ')'));
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
