/**
 * WIMC Database Migration Runner
 *
 * Setup: Add to backend/.env:
 *   SUPABASE_DB_HOST=aws-1-eu-west-3.pooler.supabase.com
 *   SUPABASE_DB_PORT=6543
 *   SUPABASE_DB_USER=postgres.qnrzrhyjdyuuajcndyhj
 *   SUPABASE_DB_PASS=YourPasswordHere
 *   SUPABASE_DB_NAME=postgres
 *
 * Usage:
 *   npx ts-node run-migrations.ts          # Run all
 *   npx ts-node run-migrations.ts --schema # Schema only (001)
 *   npx ts-node run-migrations.ts --seed   # Seed only (002)
 */

import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';
import 'dotenv/config';

const host = process.env.SUPABASE_DB_HOST;
const port = parseInt(process.env.SUPABASE_DB_PORT || '6543');
const user = process.env.SUPABASE_DB_USER;
const password = process.env.SUPABASE_DB_PASS;
const database = process.env.SUPABASE_DB_NAME || 'postgres';

if (!host || !user || !password) {
  console.error('');
  console.error('❌ Missing DB env vars. Add these to backend/.env:');
  console.error('');
  console.error('  SUPABASE_DB_HOST=aws-1-eu-west-3.pooler.supabase.com');
  console.error('  SUPABASE_DB_PORT=6543');
  console.error('  SUPABASE_DB_USER=postgres.YOUR_PROJECT_REF');
  console.error('  SUPABASE_DB_PASS=YourPasswordHere');
  console.error('  SUPABASE_DB_NAME=postgres');
  console.error('');
  process.exit(1);
}

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function runMigration(client: Client, filePath: string, fileName: string): Promise<boolean> {
  console.log(`\n🔄  Running: ${fileName}`);
  const sql = fs.readFileSync(filePath, 'utf-8');

  try {
    await client.query(sql);
    console.log(`✅  Success: ${fileName}`);
    return true;
  } catch (err: any) {
    console.error(`❌  Failed: ${fileName}`);
    console.error(`    Error: ${err.message}`);
    if (err.detail) console.error(`    Detail: ${err.detail}`);
    if (err.hint) console.error(`    Hint: ${err.hint}`);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const schemaOnly = args.includes('--schema');
  const seedOnly = args.includes('--seed');

  let files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (schemaOnly) files = files.filter(f => f.includes('001'));
  if (seedOnly) files = files.filter(f => f.includes('002'));

  if (files.length === 0) {
    console.log('No migration files found.');
    process.exit(0);
  }

  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║   WIMC — Database Migration Runner   ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');
  console.log(`📁 Migrations: ${files.length} file(s)`);
  files.forEach(f => console.log(`   - ${f}`));

  console.log(`\n🔌 Connecting to ${host}:${port} as ${user}...`);
  const client = new Client({
    host, port, user, password, database,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
    statement_timeout: 60000,
  });

  try {
    await client.connect();
    console.log('✅ Connected!');

    for (const file of files) {
      const success = await runMigration(client, path.join(MIGRATIONS_DIR, file), file);
      if (!success) {
        console.log('\n⛔ Stopping. Fix the error above and re-run.');
        process.exit(1);
      }
    }

    // Show WIMC tables
    console.log('\n📊 WIMC Tables:');
    const { rows } = await client.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename LIKE 'wimc_%'
      ORDER BY tablename;
    `);
    rows.forEach((r: any) => console.log(`   ✓ ${r.tablename}`));
    console.log(`\n   Total: ${rows.length} tables`);

    console.log('\n✅ All migrations completed successfully!');
  } catch (err: any) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
