ALTER TABLE groups
ADD COLUMN IF NOT EXISTS invite_enabled BOOLEAN DEFAULT TRUE NOT NULL;

ALTER TABLE groups
ADD COLUMN IF NOT EXISTS invite_approval_required BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE groups
ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE groups
ADD COLUMN IF NOT EXISTS invite_max_uses INTEGER;

ALTER TABLE groups
ADD COLUMN IF NOT EXISTS invite_uses INTEGER DEFAULT 0 NOT NULL;

ALTER TABLE groups
ADD COLUMN IF NOT EXISTS min_trust_score_to_join INTEGER DEFAULT 0 NOT NULL;

ALTER TABLE groups
ADD COLUMN IF NOT EXISTS public_invite_message TEXT;

CREATE TABLE IF NOT EXISTS group_rules (
  group_id VARCHAR PRIMARY KEY REFERENCES groups(id) ON DELETE CASCADE,
  due_grace_days INTEGER DEFAULT 3 NOT NULL,
  proof_required BOOLEAN DEFAULT TRUE NOT NULL,
  minimum_member_confirmations INTEGER DEFAULT 1 NOT NULL,
  late_payment_policy TEXT DEFAULT 'Members should upload proof before the due date. Late payments are tracked for transparency.' NOT NULL,
  dispute_policy TEXT DEFAULT 'Payment issues should be opened as structured disputes and resolved by the organizer or co-organizer.' NOT NULL,
  review_policy TEXT DEFAULT 'Members are encouraged to review each other after completed cycles.' NOT NULL,
  custom_rules TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS late_payment_cases (
  id VARCHAR PRIMARY KEY,
  group_id VARCHAR NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  contribution_id VARCHAR NOT NULL REFERENCES contributions(id) ON DELETE CASCADE,
  cycle_id VARCHAR REFERENCES cycles(id) ON DELETE SET NULL,
  member_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  marked_by_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR DEFAULT 'open' NOT NULL,
  reason TEXT,
  member_explanation TEXT,
  organizer_note TEXT,
  reminder_count INTEGER DEFAULT 0 NOT NULL,
  last_reminder_at TIMESTAMP WITH TIME ZONE,
  resolved_by_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_late_payment_case_contribution
ON late_payment_cases(contribution_id);

CREATE INDEX IF NOT EXISTS ix_late_payment_cases_group_status
ON late_payment_cases(group_id, status);

CREATE TABLE IF NOT EXISTS group_announcements (
  id VARCHAR PRIMARY KEY,
  group_id VARCHAR NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  author_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  body TEXT NOT NULL,
  priority VARCHAR DEFAULT 'normal' NOT NULL,
  pinned BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_group_announcements_group_created
ON group_announcements(group_id, created_at DESC);

CREATE TABLE IF NOT EXISTS group_announcement_acknowledgements (
  announcement_id VARCHAR NOT NULL REFERENCES group_announcements(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  PRIMARY KEY (announcement_id, user_id)
);