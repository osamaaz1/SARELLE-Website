-- 008_developer_dashboard.sql
-- Adds developer role, account disabling, error logging

-- 1. Add 'developer' to wimc_role enum
ALTER TYPE wimc_role ADD VALUE IF NOT EXISTS 'developer';

-- 2. Add disabled_at column to wimc_profiles
ALTER TABLE wimc_profiles
  ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Create wimc_error_log table
CREATE TABLE IF NOT EXISTS wimc_error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  stack_trace TEXT,
  endpoint VARCHAR(500),
  http_status INT,
  user_id UUID REFERENCES auth.users(id),
  request_body JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Index for time-based queries on error_log
CREATE INDEX IF NOT EXISTS idx_wimc_error_log_created_at ON wimc_error_log(created_at DESC);

-- 5. Index for time-based queries on audit_log
CREATE INDEX IF NOT EXISTS idx_wimc_audit_log_created_at ON wimc_audit_log(created_at DESC);

-- 6. Enable RLS on wimc_error_log
ALTER TABLE wimc_error_log ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (backend uses service role key)
CREATE POLICY "Service role full access on error_log"
  ON wimc_error_log
  FOR ALL
  USING (true)
  WITH CHECK (true);
