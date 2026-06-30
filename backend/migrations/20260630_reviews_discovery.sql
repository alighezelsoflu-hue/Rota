CREATE TABLE IF NOT EXISTS member_reviews (
  id VARCHAR PRIMARY KEY,
  reviewer_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewed_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id VARCHAR NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  tags TEXT DEFAULT '[]' NOT NULL,
  note TEXT,
  visibility VARCHAR DEFAULT 'network' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_member_review_once_per_group
ON member_reviews(reviewer_user_id, reviewed_user_id, group_id);

CREATE TABLE IF NOT EXISTS discovery_profiles (
  user_id VARCHAR PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  is_discoverable BOOLEAN DEFAULT FALSE NOT NULL,
  city VARCHAR,
  country VARCHAR,
  latitude_approx FLOAT,
  longitude_approx FLOAT,
  radius_km INTEGER DEFAULT 25 NOT NULL,
  preferred_min_amount FLOAT,
  preferred_max_amount FLOAT,
  preferred_currency VARCHAR DEFAULT 'EUR',
  preferred_frequency VARCHAR DEFAULT 'monthly',
  bio TEXT,
  open_to_new_groups BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS group_discovery_settings (
  group_id VARCHAR PRIMARY KEY REFERENCES groups(id) ON DELETE CASCADE,
  is_discoverable BOOLEAN DEFAULT FALSE NOT NULL,
  looking_for_members BOOLEAN DEFAULT FALSE NOT NULL,
  city VARCHAR,
  country VARCHAR,
  latitude_approx FLOAT,
  longitude_approx FLOAT,
  radius_km INTEGER DEFAULT 25 NOT NULL,
  open_slots INTEGER DEFAULT 0 NOT NULL,
  min_trust_score INTEGER DEFAULT 0 NOT NULL,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS connection_requests (
  id VARCHAR PRIMARY KEY,
  requester_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status VARCHAR DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_connection_request_pair
ON connection_requests(requester_user_id, receiver_user_id);

CREATE TABLE IF NOT EXISTS group_join_requests (
  id VARCHAR PRIMARY KEY,
  group_id VARCHAR NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  requester_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status VARCHAR DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_group_join_request_once
ON group_join_requests(group_id, requester_user_id);