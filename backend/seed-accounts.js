/**
 * Creates WIMC test accounts via Supabase Auth API (proper way)
 * then seeds wimc_profiles + all related data.
 *
 * IMPORTANT: This script CLEANS all existing data first!
 *
 * Usage: node seed-accounts.js
 *
 * Rules:
 *  - Any user can buy AND sell (no buyer/seller distinction)
 *  - Celebrity items = auction ONLY (have celebrity_id)
 *  - Regular items = buy now + offer ONLY (no celebrity_id, fixed_price)
 *  - Each celebrity has their own account and their own products
 */
require('dotenv/config');
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const ACCOUNTS = [
  { email: 'admin@whatinmycloset.com', password: 'Admin123!', display_name: 'WIMC Admin', role: 'admin', tier: 'Gold', points: 2000 },
  { email: 'dev@whatinmycloset.com', password: 'Dev123!', display_name: 'WIMC Developer', role: 'developer', tier: 'Gold', points: 0 },
  { email: 'sara@test.wimc.com', password: 'Test123!', display_name: 'Sara Ahmed', role: 'customer', tier: 'Silver', points: 750 },
  { email: 'nadia@test.wimc.com', password: 'Test123!', display_name: 'Nadia El-Sayed', role: 'customer', tier: 'Bronze', points: 100 },
  { email: 'reem@test.wimc.com', password: 'Test123!', display_name: 'Reem Mostafa', role: 'customer', tier: 'Bronze', points: 50 },
  { email: 'buyer@test.wimc.com', password: 'Test123!', display_name: 'Bea Buyer', role: 'customer', tier: 'Bronze', points: 0 },
  // Celebrities
  { email: 'yasmine@test.wimc.com', password: 'Test123!', display_name: 'Yasmine Sabri', role: 'celebrity', tier: 'Platinum', points: 8000 },
  { email: 'ramadan@test.wimc.com', password: 'Test123!', display_name: 'Mohamed Ramadan', role: 'celebrity', tier: 'Platinum', points: 6000 },
  { email: 'hend@test.wimc.com', password: 'Test123!', display_name: 'Hend Sabry', role: 'celebrity', tier: 'Platinum', points: 5000 },
  { email: 'amr@test.wimc.com', password: 'Test123!', display_name: 'Amr Diab', role: 'celebrity', tier: 'Platinum', points: 7000 },
];

// High-quality Unsplash images matched to each product
const IMAGES = {
  birkin:       'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&h=800&fit=crop&q=80',
  marmont:      'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&h=800&fit=crop&q=80',
  prada:        'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=800&h=800&fit=crop&q=80',
  speedy:       'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&h=800&fit=crop&q=80',
  louboutin:    'https://images.unsplash.com/photo-1596703263926-eb0762ee17e4?w=800&h=800&fit=crop&q=80',
  valentino:    'https://images.unsplash.com/photo-1621996659490-3275b4d0d951?w=800&h=800&fit=crop&q=80',
  cartier:      'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&h=800&fit=crop&q=80',
  ladydior:     'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=800&h=800&fit=crop&q=80',
  kelly:        'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=800&h=800&fit=crop&q=80',
  vancleef:     'https://images.unsplash.com/photo-1600721391689-2564bb8055de?w=800&h=800&fit=crop&q=80',
  chanelflap:   'https://images.unsplash.com/photo-1598532163257-ae3c6b2524b6?w=800&h=800&fit=crop&q=80',
  datejust:     'https://images.unsplash.com/photo-1620625515032-6ed0c1790c75?w=800&h=800&fit=crop&q=80',
  // Mohamed Ramadan items
  submariner:   'https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=800&h=800&fit=crop&q=80',
  keepall:      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=800&fit=crop&q=80',
  tomford:      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=800&fit=crop&q=80',
  // Hend Sabry items
  chanelboy:    'https://images.unsplash.com/photo-1628149455678-16f37bc392f4?w=800&h=800&fit=crop&q=80',
  tiffany:      'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&h=800&fit=crop&q=80',
  jimmychoo:    'https://images.unsplash.com/photo-1581101767113-1677fc2beaa8?w=800&h=800&fit=crop&q=80',
  // Amr Diab items
  patek:        'https://images.unsplash.com/photo-1548169874-53e85f753f1e?w=800&h=800&fit=crop&q=80',
  berluti:      'https://images.unsplash.com/photo-1449505278894-297fdb3edbc1?w=800&h=800&fit=crop&q=80',
  montblanc:    'https://images.unsplash.com/photo-1608731267464-c0c889c2ff92?w=800&h=800&fit=crop&q=80',
};

async function cleanAll(pg) {
  console.log('--- Cleaning existing data ---');
  const tables = [
    'wimc_order_events', 'wimc_payouts', 'wimc_orders',
    'wimc_bids', 'wimc_auctions',
    'wimc_offers', 'wimc_saved_items', 'wimc_listings',
    'wimc_submission_events', 'wimc_submissions',
    'wimc_notifications', 'wimc_idempotency_keys',
    'wimc_celebrities', 'wimc_vip_profiles', 'wimc_seller_profiles', 'wimc_profiles',
  ];
  for (const t of tables) {
    try { await pg.query(`DELETE FROM ${t}`); } catch {}
  }
  console.log('Tables cleaned.');

  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 100 });
  if (authUsers?.users?.length) {
    for (const u of authUsers.users) {
      await supabase.auth.admin.deleteUser(u.id);
    }
    console.log('Deleted ' + authUsers.users.length + ' auth users.');
  } else {
    console.log('No auth users to delete.');
  }
  console.log('');
}

async function main() {
  console.log('=== WIMC Account & Data Seeder ===\n');

  const pg = new Client({
    host: process.env.SUPABASE_DB_HOST,
    port: parseInt(process.env.SUPABASE_DB_PORT || '5432'),
    user: process.env.SUPABASE_DB_USER,
    password: process.env.SUPABASE_DB_PASS,
    database: process.env.SUPABASE_DB_NAME || 'postgres',
    ssl: { rejectUnauthorized: false },
  });
  await pg.connect();

  // Step 0: Clean everything
  await cleanAll(pg);

  // Step 1: Create auth users
  console.log('--- Creating auth users ---');
  const userIds = {};
  for (const acc of ACCOUNTS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: acc.email,
      password: acc.password,
      email_confirm: true,
    });
    if (error) {
      console.log('FAIL: ' + acc.email + ' -> ' + error.message);
      await pg.end();
      process.exit(1);
    }
    userIds[acc.email] = data.user.id;
    console.log('OK: ' + acc.email + ' -> ' + data.user.id.substring(0, 8) + '...');
  }

  const adminId = userIds['admin@whatinmycloset.com'];
  const saraId = userIds['sara@test.wimc.com'];
  const nadiaId = userIds['nadia@test.wimc.com'];
  const reemId = userIds['reem@test.wimc.com'];
  const buyerId = userIds['buyer@test.wimc.com'];
  const yasmineId = userIds['yasmine@test.wimc.com'];
  const ramadanId = userIds['ramadan@test.wimc.com'];
  const hendId = userIds['hend@test.wimc.com'];
  const amrId = userIds['amr@test.wimc.com'];

  // Step 2: Profiles
  console.log('\n--- Profiles ---');
  for (const acc of ACCOUNTS) {
    await pg.query(
      `INSERT INTO wimc_profiles (id, display_name, role, points, tier) VALUES ($1, $2, $3::wimc_role, $4, $5)`,
      [userIds[acc.email], acc.display_name, acc.role, acc.points, acc.tier]
    );
    console.log('PROFILE: ' + acc.display_name + ' (' + acc.role + ')');
  }

  // Step 3: Seller profiles
  const sellerEmails = ['sara@test.wimc.com', 'nadia@test.wimc.com', 'yasmine@test.wimc.com', 'ramadan@test.wimc.com', 'hend@test.wimc.com', 'amr@test.wimc.com'];
  for (const email of sellerEmails) {
    await pg.query(
      `INSERT INTO wimc_seller_profiles (user_id, address, payout_method) VALUES ($1, $2, $3)`,
      [userIds[email], 'Cairo, Egypt', JSON.stringify({ type: 'bank_transfer', bank: 'CIB' })]
    );
  }
  console.log('SELLER PROFILES: ' + sellerEmails.length);

  // Step 4: VIP profiles for all celebrities
  const vipData = [
    { id: yasmineId, bio: 'Egyptian actress and fashion icon', followers: '72M' },
    { id: ramadanId, bio: 'Egyptian actor and singer', followers: '65M' },
    { id: hendId, bio: 'Tunisian-Egyptian actress', followers: '18M' },
    { id: amrId, bio: 'The Father of Mediterranean Music', followers: '35M' },
  ];
  for (const v of vipData) {
    await pg.query(
      `INSERT INTO wimc_vip_profiles (user_id, bio, followers, approved_by, approved_at) VALUES ($1, $2, $3, $4, NOW())`,
      [v.id, v.bio, v.followers, adminId]
    );
  }
  console.log('VIP PROFILES: 4');

  // Step 5: Celebrities
  console.log('\n--- Celebrities ---');
  const celebs = [
    { name: 'Yasmine Sabri', bio: 'Egyptian actress and fashion icon', followers: '72M', user_id: yasmineId },
    { name: 'Mohamed Ramadan', bio: 'Egyptian actor and singer', followers: '65M', user_id: ramadanId },
    { name: 'Hend Sabry', bio: 'Tunisian-Egyptian actress', followers: '18M', user_id: hendId },
    { name: 'Amr Diab', bio: 'The Father of Mediterranean Music', followers: '35M', user_id: amrId },
  ];
  const celebIds = {};
  for (const c of celebs) {
    const { rows } = await pg.query(
      `INSERT INTO wimc_celebrities (name, bio, followers, user_id, verified, avatar_url) VALUES ($1, $2, $3, $4, true, $5) RETURNING id`,
      [c.name, c.bio, c.followers, c.user_id, null]
    );
    celebIds[c.name] = rows[0].id;
    console.log('CELEBRITY: ' + c.name);
  }

  // Step 6: Listings — each with unique matching image
  console.log('\n--- Listings ---');
  const listings = [
    // ===== Regular items (fixed_price, NO celebrity_id) =====
    // Sara's items
    { seller_id: saraId, brand: 'Hermès', name: 'Birkin 30 Togo Leather', category: 'Bags', condition: 'Excellent', price: 45000, original_price: 52000, featured: true, celebrity_id: null, listing_type: 'fixed_price', photo: IMAGES.birkin },
    { seller_id: saraId, brand: 'Gucci', name: 'GG Marmont Small Shoulder', category: 'Bags', condition: 'Like New', price: 2200, original_price: 2800, featured: false, celebrity_id: null, listing_type: 'fixed_price', photo: IMAGES.marmont },
    { seller_id: saraId, brand: 'Prada', name: 'Re-Edition 2005 Nylon', category: 'Bags', condition: 'Excellent', price: 1450, original_price: 1850, featured: false, celebrity_id: null, listing_type: 'fixed_price', photo: IMAGES.prada },
    // Nadia's items
    { seller_id: nadiaId, brand: 'Louis Vuitton', name: 'Speedy 25 Monogram', category: 'Bags', condition: 'Good', price: 1650, original_price: 2100, featured: false, celebrity_id: null, listing_type: 'fixed_price', photo: IMAGES.speedy },
    { seller_id: nadiaId, brand: 'Christian Louboutin', name: 'So Kate 120 Patent', category: 'Shoes', condition: 'Good', price: 750, original_price: 1100, featured: false, celebrity_id: null, listing_type: 'fixed_price', photo: IMAGES.louboutin },
    { seller_id: nadiaId, brand: 'Valentino', name: 'Rockstud Pump 100', category: 'Shoes', condition: 'Good', price: 620, original_price: 950, featured: false, celebrity_id: null, listing_type: 'fixed_price', photo: IMAGES.valentino },
    // Reem's items (buyers can sell too)
    { seller_id: reemId, brand: 'Chanel', name: 'Classic Flap Medium Caviar', category: 'Bags', condition: 'Like New', price: 22500, original_price: 28000, featured: true, celebrity_id: null, listing_type: 'fixed_price', photo: IMAGES.chanelflap },
    { seller_id: reemId, brand: 'Rolex', name: 'Datejust 36 Silver Dial', category: 'Watches', condition: 'Excellent', price: 18500, original_price: 24000, featured: true, celebrity_id: null, listing_type: 'fixed_price', photo: IMAGES.datejust },

    // ===== Celebrity items (auction ONLY, with celebrity_id) =====
    // Yasmine Sabri's closet
    { seller_id: yasmineId, brand: 'Cartier', name: 'Love Bracelet 18K Yellow Gold', category: 'Jewellery', condition: 'Excellent', price: 8500, original_price: 10500, featured: true, celebrity_id: celebIds['Yasmine Sabri'], listing_type: 'auction', photo: IMAGES.cartier },
    { seller_id: yasmineId, brand: 'Dior', name: 'Lady Dior Medium Cannage', category: 'Bags', condition: 'Like New', price: 5800, original_price: 7200, featured: true, celebrity_id: celebIds['Yasmine Sabri'], listing_type: 'auction', photo: IMAGES.ladydior },
    { seller_id: yasmineId, brand: 'Hermès', name: 'Kelly 28 Epsom Gold', category: 'Bags', condition: 'Excellent', price: 38000, original_price: 45000, featured: true, celebrity_id: celebIds['Yasmine Sabri'], listing_type: 'auction', photo: IMAGES.kelly },
    { seller_id: yasmineId, brand: 'Van Cleef & Arpels', name: 'Alhambra Necklace 10 Motifs', category: 'Jewellery', condition: 'Like New', price: 12500, original_price: 15000, featured: true, celebrity_id: celebIds['Yasmine Sabri'], listing_type: 'auction', photo: IMAGES.vancleef },

    // Mohamed Ramadan's closet
    { seller_id: ramadanId, brand: 'Rolex', name: 'Submariner Date 41mm', category: 'Watches', condition: 'Excellent', price: 25000, original_price: 32000, featured: true, celebrity_id: celebIds['Mohamed Ramadan'], listing_type: 'auction', photo: IMAGES.submariner },
    { seller_id: ramadanId, brand: 'Louis Vuitton', name: 'Keepall 55 Bandoulière', category: 'Bags', condition: 'Like New', price: 8200, original_price: 11000, featured: true, celebrity_id: celebIds['Mohamed Ramadan'], listing_type: 'auction', photo: IMAGES.keepall },
    { seller_id: ramadanId, brand: 'Tom Ford', name: 'Buckley Three-Piece Suit', category: 'Clothing', condition: 'Like New', price: 4500, original_price: 7500, featured: false, celebrity_id: celebIds['Mohamed Ramadan'], listing_type: 'auction', photo: IMAGES.tomford },

    // Hend Sabry's closet
    { seller_id: hendId, brand: 'Chanel', name: 'Boy Bag Medium Calfskin', category: 'Bags', condition: 'Excellent', price: 15000, original_price: 19500, featured: true, celebrity_id: celebIds['Hend Sabry'], listing_type: 'auction', photo: IMAGES.chanelboy },
    { seller_id: hendId, brand: 'Tiffany & Co.', name: 'T Wire Bracelet 18K Rose Gold', category: 'Jewellery', condition: 'Like New', price: 6800, original_price: 8500, featured: true, celebrity_id: celebIds['Hend Sabry'], listing_type: 'auction', photo: IMAGES.tiffany },
    { seller_id: hendId, brand: 'Jimmy Choo', name: 'Romy 100 Glitter Pumps', category: 'Shoes', condition: 'Good', price: 3200, original_price: 4800, featured: false, celebrity_id: celebIds['Hend Sabry'], listing_type: 'auction', photo: IMAGES.jimmychoo },

    // Amr Diab's closet
    { seller_id: amrId, brand: 'Patek Philippe', name: 'Nautilus 5711/1A Blue Dial', category: 'Watches', condition: 'Excellent', price: 95000, original_price: 120000, featured: true, celebrity_id: celebIds['Amr Diab'], listing_type: 'auction', photo: IMAGES.patek },
    { seller_id: amrId, brand: 'Berluti', name: 'Alessandro Leather Loafers', category: 'Shoes', condition: 'Like New', price: 5500, original_price: 7200, featured: false, celebrity_id: celebIds['Amr Diab'], listing_type: 'auction', photo: IMAGES.berluti },
    { seller_id: amrId, brand: 'Montblanc', name: 'Meisterstück Leather Briefcase', category: 'Bags', condition: 'Excellent', price: 7800, original_price: 9500, featured: true, celebrity_id: celebIds['Amr Diab'], listing_type: 'auction', photo: IMAGES.montblanc },
  ];

  const listingIds = [];
  for (const l of listings) {
    const ownerName = ACCOUNTS.find(a => userIds[a.email] === l.seller_id).display_name;
    const { rows } = await pg.query(
      `INSERT INTO wimc_listings (seller_id, brand, name, category, condition, price, original_price, featured, celebrity_id, status, listing_type, description, photos)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'published', $10, $11, $12) RETURNING id`,
      [l.seller_id, l.brand, l.name, l.category, l.condition, l.price, l.original_price, l.featured, l.celebrity_id, l.listing_type,
       l.brand + ' ' + l.name + ' in ' + l.condition + ' condition. Authenticated by WIMC.',
       [l.photo]]
    );
    listingIds.push({ name: l.brand + ' ' + l.name, id: rows[0].id, listing_type: l.listing_type, price: l.price, celebrity_id: l.celebrity_id, seller_id: l.seller_id });
    console.log((l.celebrity_id ? 'AUCTION' : 'FIXED') + ': ' + l.brand + ' ' + l.name + ' (by ' + ownerName + ')');
  }

  // Step 7: Auctions (only for celebrity/auction items)
  console.log('\n--- Auctions ---');
  const auctionListings = listingIds.filter(l => l.listing_type === 'auction');
  for (const l of auctionListings) {
    const startsAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const endsAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const reservePrice = Math.round(l.price * 1.1);
    await pg.query(
      `INSERT INTO wimc_auctions (id, listing_id, starting_price, reserve_price, reserve_met, current_price, current_winner_id, status, starts_at, ends_at, bid_count)
       VALUES (gen_random_uuid(), $1, $2, $3, false, $2, NULL, 'active', $4, $5, 0)`,
      [l.id, l.price, reservePrice, startsAt, endsAt]
    );
    console.log('AUCTION: ' + l.name + ' (start: ' + l.price.toLocaleString() + ', reserve: ' + reservePrice.toLocaleString() + ')');
  }

  // Step 8: Submissions (various stages)
  console.log('\n--- Submissions ---');
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
    await pg.query(
      `INSERT INTO wimc_submission_events (submission_id, actor_id, message, old_stage, new_stage) VALUES ($1, $2, $3, NULL, $4::wimc_submission_stage)`,
      [rows[0].id, s.seller_id, 'Submission created', 'pending_review']
    );
    console.log('SUBMISSION: ' + s.brand + ' ' + s.name + ' (' + s.stage + ')');
  }

  // Step 9: Orders (on fixed_price items)
  console.log('\n--- Orders ---');
  const fixedListings = listingIds.filter(l => l.listing_type === 'fixed_price');
  const item1 = fixedListings.find(l => l.seller_id === nadiaId);
  if (item1) {
    await pg.query(
      `INSERT INTO wimc_orders (listing_id, buyer_id, seller_id, item_price, service_fee, shipping_fee, total, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'paid'::wimc_order_status)`,
      [item1.id, reemId, nadiaId, item1.price, Math.round(item1.price * 0.05), 50, Math.round(item1.price * 1.05) + 50]
    );
    console.log('ORDER: ' + item1.name + ' (Reem buys from Nadia, paid)');
  }
  const item2 = fixedListings.find(l => l.seller_id === saraId);
  if (item2) {
    await pg.query(
      `INSERT INTO wimc_orders (listing_id, buyer_id, seller_id, item_price, service_fee, shipping_fee, total, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'shipped'::wimc_order_status)`,
      [item2.id, buyerId, saraId, item2.price, Math.round(item2.price * 0.05), 50, Math.round(item2.price * 1.05) + 50]
    );
    console.log('ORDER: ' + item2.name + ' (Bea buys from Sara, shipped)');
  }

  // Step 10: Notifications
  console.log('\n--- Notifications ---');
  const allUserIds = [saraId, nadiaId, reemId, buyerId, yasmineId, ramadanId, hendId, amrId];
  for (const uid of allUserIds) {
    await pg.query(
      `INSERT INTO wimc_notifications (user_id, type, title, message) VALUES ($1, 'info', 'Welcome to WIMC!', 'Your account is ready. Start exploring!')`,
      [uid]
    );
  }
  console.log('NOTIFICATIONS: ' + allUserIds.length + ' welcome messages');

  await pg.end();

  // Step 11: Verify ALL logins
  console.log('\n=== Testing Logins ===');
  let allOk = true;
  for (const acc of ACCOUNTS) {
    const { error: loginErr } = await supabase.auth.signInWithPassword({
      email: acc.email,
      password: acc.password,
    });
    if (loginErr) {
      console.log('FAIL: ' + acc.email + ' -> ' + loginErr.message);
      allOk = false;
    } else {
      console.log('OK: ' + acc.email);
    }
  }

  console.log('\n=== ' + (allOk ? 'ALL DONE!' : 'SOME LOGINS FAILED!') + ' ===');
  console.log('\nTest accounts (password: Test123! for all, Admin123! for admin):');
  ACCOUNTS.forEach(a => console.log('  ' + a.email + ' / ' + a.password + ' (' + a.display_name + ')'));
  console.log('\nListings summary:');
  console.log('  Regular (buy now + offer): ' + listingIds.filter(l => !l.celebrity_id).length + ' items');
  console.log('  Celebrity (auction only):  ' + auctionListings.length + ' items');
  console.log('    Yasmine Sabri:     ' + auctionListings.filter(l => l.seller_id === yasmineId).length + ' items');
  console.log('    Mohamed Ramadan:   ' + auctionListings.filter(l => l.seller_id === ramadanId).length + ' items');
  console.log('    Hend Sabry:        ' + auctionListings.filter(l => l.seller_id === hendId).length + ' items');
  console.log('    Amr Diab:          ' + auctionListings.filter(l => l.seller_id === amrId).length + ' items');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
