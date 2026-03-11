-- Payout audit trail: tracks all payout status changes
CREATE TABLE IF NOT EXISTS wimc_payout_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id UUID NOT NULL REFERENCES wimc_payouts(id),
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES wimc_profiles(id),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wimc_payout_events_payout ON wimc_payout_events(payout_id);
