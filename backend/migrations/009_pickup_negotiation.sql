-- 009_pickup_negotiation.sql
-- Add new pickup negotiation stages to the enum
ALTER TYPE wimc_submission_stage ADD VALUE IF NOT EXISTS 'pickup_proposed';
ALTER TYPE wimc_submission_stage ADD VALUE IF NOT EXISTS 'pickup_confirmed';
ALTER TYPE wimc_submission_stage ADD VALUE IF NOT EXISTS 'pickup_counter';
ALTER TYPE wimc_submission_stage ADD VALUE IF NOT EXISTS 'pickup_cancelled';

-- Add pickup negotiation columns to wimc_submissions
ALTER TABLE wimc_submissions
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS pickup_time_from TEXT,
  ADD COLUMN IF NOT EXISTS pickup_time_to TEXT,
  ADD COLUMN IF NOT EXISTS admin_suggested_date TEXT,
  ADD COLUMN IF NOT EXISTS admin_suggested_time_from TEXT,
  ADD COLUMN IF NOT EXISTS admin_suggested_time_to TEXT,
  ADD COLUMN IF NOT EXISTS admin_pickup_notes TEXT;

-- Tell PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
