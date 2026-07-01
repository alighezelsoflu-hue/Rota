CREATE TABLE IF NOT EXISTS dispute_cases (
  id VARCHAR PRIMARY KEY,
  group_id VARCHAR NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  contribution_id VARCHAR NOT NULL REFERENCES contributions(id) ON DELETE CASCADE,
  cycle_id VARCHAR REFERENCES cycles(id) ON DELETE SET NULL,
  opened_by_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  reason VARCHAR NOT NULL,
  note TEXT,
  evidence_text TEXT,
  status VARCHAR DEFAULT 'open' NOT NULL,
  resolution_note TEXT,
  resolved_by_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dispute_case_contribution
ON dispute_cases(contribution_id);

CREATE INDEX IF NOT EXISTS ix_dispute_cases_group_status
ON dispute_cases(group_id, status);

CREATE INDEX IF NOT EXISTS ix_dispute_cases_opened_by
ON dispute_cases(opened_by_user_id);