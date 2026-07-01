CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id VARCHAR PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  payment_reminders BOOLEAN DEFAULT TRUE NOT NULL,
  group_messages BOOLEAN DEFAULT TRUE NOT NULL,
  connection_requests BOOLEAN DEFAULT TRUE NOT NULL,
  join_requests BOOLEAN DEFAULT TRUE NOT NULL,
  agreement_reminders BOOLEAN DEFAULT TRUE NOT NULL,
  vote_reminders BOOLEAN DEFAULT TRUE NOT NULL,
  review_reminders BOOLEAN DEFAULT TRUE NOT NULL,
  email_notifications BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  body TEXT,
  related_group_id VARCHAR REFERENCES groups(id) ON DELETE SET NULL,
  related_thread_id VARCHAR,
  related_url VARCHAR,
  dedupe_key VARCHAR NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_dedupe
ON notifications(user_id, dedupe_key);

CREATE INDEX IF NOT EXISTS ix_notifications_user_created
ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_notifications_user_read
ON notifications(user_id, read_at);