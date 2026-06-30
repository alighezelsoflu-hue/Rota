ALTER TABLE groups
ADD COLUMN IF NOT EXISTS agreement_required BOOLEAN DEFAULT TRUE NOT NULL;

ALTER TABLE groups
ADD COLUMN IF NOT EXISTS agreement_text TEXT;

ALTER TABLE groups
ADD COLUMN IF NOT EXISTS agreement_version INTEGER DEFAULT 1 NOT NULL;

ALTER TABLE groups
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE groups
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE groups
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE groups
ADD COLUMN IF NOT EXISTS continuation_vote_cycle_id VARCHAR;

ALTER TABLE groups
ADD COLUMN IF NOT EXISTS continuation_vote_opened_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE group_members
ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active' NOT NULL;

ALTER TABLE group_members
ADD COLUMN IF NOT EXISTS agreement_accepted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE group_members
ADD COLUMN IF NOT EXISTS agreement_version INTEGER;

ALTER TABLE group_members
ADD COLUMN IF NOT EXISTS has_received_payout BOOLEAN DEFAULT FALSE NOT NULL;

UPDATE group_members
SET status = 'active'
WHERE status IS NULL;

UPDATE group_members
SET agreement_version = 1
WHERE agreement_version IS NULL;

UPDATE group_members
SET agreement_accepted_at = NOW()
WHERE agreement_accepted_at IS NULL;

CREATE TABLE IF NOT EXISTS group_continuation_votes (
  id VARCHAR PRIMARY KEY,
  group_id VARCHAR NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  cycle_id VARCHAR NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  voter_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  decision VARCHAR NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_group_continuation_vote_once
ON group_continuation_votes(group_id, cycle_id, voter_user_id);

CREATE TABLE IF NOT EXISTS contribution_member_confirmations (
  id VARCHAR PRIMARY KEY,
  contribution_id VARCHAR NOT NULL REFERENCES contributions(id) ON DELETE CASCADE,
  reviewer_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  decision VARCHAR NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_contribution_member_review_once
ON contribution_member_confirmations(contribution_id, reviewer_user_id);