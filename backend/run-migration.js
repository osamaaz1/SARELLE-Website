/**
 * One-off script to run a SQL migration file via Supabase service role client.
 * Usage: node run-migration.js migrations/007_payout_events.sql
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const file = process.argv[2];
if (!file) {
  console.error('Usage: node run-migration.js <path-to-sql-file>');
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(file), 'utf-8').trim();
if (!sql) {
  console.error('Migration file is empty');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

(async () => {
  console.log(`Running migration: ${file}`);
  const { data, error } = await supabase.rpc('exec_sql', { query: sql }).maybeSingle();
  if (error) {
    // rpc('exec_sql') may not exist — fall back to raw REST
    console.log('rpc exec_sql not available, trying direct PostgreSQL...');
    // Use the postgres connection instead
    const { Client } = require('pg');
    const pg = new Client({
      host: process.env.SUPABASE_DB_HOST,
      port: parseInt(process.env.SUPABASE_DB_PORT || '5432'),
      user: process.env.SUPABASE_DB_USER,
      password: process.env.SUPABASE_DB_PASS,
      database: process.env.SUPABASE_DB_NAME || 'postgres',
      ssl: { rejectUnauthorized: false },
    });
    try {
      await pg.connect();
      // Split on semicolons and run each statement separately.
      // This is required because ALTER TYPE ... ADD VALUE cannot run
      // inside a multi-statement implicit transaction.
      const statements = sql
        .split(';')
        .map(s => s.replace(/--.*$/gm, '').trim())
        .filter(s => s.length > 0);
      for (const stmt of statements) {
        const result = await pg.query(stmt);
        if (result.command) console.log(`  ${result.command}: ${stmt.slice(0, 60)}...`);
      }
      console.log('Migration applied successfully.');
    } catch (pgErr) {
      console.error('Migration failed:', pgErr.message);
      process.exit(1);
    } finally {
      await pg.end();
    }
    return;
  }
  console.log('Migration applied successfully via rpc.');
})();
