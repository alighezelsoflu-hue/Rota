ALTER TABLE groups
ADD COLUMN IF NOT EXISTS join_approval_mode VARCHAR DEFAULT 'organizer' NOT NULL;

ALTER TABLE groups
ADD COLUMN IF NOT EXISTS leave_approval_mode VARCHAR DEFAULT 'organizer' NOT NULL;

ALTER TABLE groups
ADD COLUMN IF NOT EXISTS invite_enabled BOOLEAN DEFAULT TRUE NOT NULL;

ALTER TABLE groups
ADD COLUMN IF NOT EXISTS invite_approval_required BOOLEAN DEFAULT TRUE NOT NULL;

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

UPDATE groups
SET join_approval_mode = 'organizer'
WHERE join_approval_mode IS NULL OR join_approval_mode = '';

UPDATE groups
SET leave_approval_mode = 'organizer'
WHERE leave_approval_mode IS NULL OR leave_approval_mode = '';

UPDATE groups
SET invite_approval_required = TRUE
WHERE join_approval_mode != 'open';

ALTER TABLE group_members
ADD COLUMN IF NOT EXISTS left_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE group_members
ADD COLUMN IF NOT EXISTS removed_reason TEXT;

CREATE TABLE IF NOT EXISTS group_join_requests (
  id VARCHAR PRIMARY KEY,
  group_id VARCHAR NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  requester_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_by_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  message TEXT,
  status VARCHAR DEFAULT 'pending' NOT NULL,
  approval_mode VARCHAR DEFAULT 'organizer' NOT NULL,
  requester_trust_score INTEGER DEFAULT 0 NOT NULL,
  decided_by_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  decided_at TIMESTAMP WITH TIME ZONE,
  decision_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE group_join_requests
ADD COLUMN IF NOT EXISTS invited_by_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE group_join_requests
ADD COLUMN IF NOT EXISTS approval_mode VARCHAR DEFAULT 'organizer' NOT NULL;

ALTER TABLE group_join_requests
ADD COLUMN IF NOT EXISTS requester_trust_score INTEGER DEFAULT 0 NOT NULL;

ALTER TABLE group_join_requests
ADD COLUMN IF NOT EXISTS decided_by_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE group_join_requests
ADD COLUMN IF NOT EXISTS decided_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE group_join_requests
ADD COLUMN IF NOT EXISTS decision_note TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_group_join_request_once
ON group_join_requests(group_id, requester_user_id);

CREATE TABLE IF NOT EXISTS group_join_request_votes (
  request_id VARCHAR NOT NULL REFERENCES group_join_requests(id) ON DELETE CASCADE,
  voter_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  decision VARCHAR NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  PRIMARY KEY (request_id, voter_user_id)
);

CREATE TABLE IF NOT EXISTS group_leave_requests (
  id VARCHAR PRIMARY KEY,
  group_id VARCHAR NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  requester_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status VARCHAR DEFAULT 'pending' NOT NULL,
  approval_mode VARCHAR DEFAULT 'organizer' NOT NULL,
  decided_by_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  decided_at TIMESTAMP WITH TIME ZONE,
  decision_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_group_leave_request_open
ON group_leave_requests(group_id, requester_user_id)
WHERE status IN ('pending', 'approved_waiting_completion');

CREATE TABLE IF NOT EXISTS group_leave_request_votes (
  request_id VARCHAR NOT NULL REFERENCES group_leave_requests(id) ON DELETE CASCADE,
  voter_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  decision VARCHAR NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  PRIMARY KEY (request_id, voter_user_id)
);