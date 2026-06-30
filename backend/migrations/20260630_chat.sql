CREATE TABLE IF NOT EXISTS chat_threads (
  id VARCHAR PRIMARY KEY,
  type VARCHAR NOT NULL CHECK (type IN ('group', 'direct')),
  group_id VARCHAR REFERENCES groups(id) ON DELETE CASCADE,
  direct_key VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_group_chat_thread
ON chat_threads(group_id)
WHERE type = 'group' AND group_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_direct_chat_thread
ON chat_threads(direct_key)
WHERE type = 'direct' AND direct_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS chat_thread_members (
  thread_id VARCHAR NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP WITH TIME ZONE,
  muted BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id VARCHAR PRIMARY KEY,
  thread_id VARCHAR NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  sender_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  edited_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS ix_chat_messages_thread_created
ON chat_messages(thread_id, created_at);

CREATE TABLE IF NOT EXISTS message_reports (
  id VARCHAR PRIMARY KEY,
  message_id VARCHAR NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  reporter_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_message_report_once
ON message_reports(message_id, reporter_user_id);