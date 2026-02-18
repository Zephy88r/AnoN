-- Create users table for proper user tracking
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anon_id TEXT UNIQUE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for active users lookup
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_anon_id ON users(anon_id);

-- Migrate existing users from sessions table (if sessions exist)
INSERT INTO users (anon_id, is_active, last_seen_at, last_login_at, created_at)
SELECT DISTINCT ON (anon_id)
    anon_id,
    (expires_at > CURRENT_TIMESTAMP) AS is_active,
    COALESCE(last_activity_at, issued_at, created_at) AS last_seen_at,
    COALESCE(issued_at, created_at) AS last_login_at,
    COALESCE(created_at, issued_at) AS created_at
FROM sessions
WHERE EXISTS (SELECT 1 FROM sessions)
ORDER BY anon_id, created_at ASC
ON CONFLICT (anon_id) DO NOTHING;

-- Also include users from devices table who may not have sessions yet
INSERT INTO users (anon_id, is_active, last_seen_at, last_login_at, created_at)
SELECT 
    anon_id,
    false AS is_active,
    updated_at AS last_seen_at,
    created_at AS last_login_at,
    created_at
FROM devices
WHERE EXISTS (SELECT 1 FROM devices)
  AND anon_id NOT IN (SELECT anon_id FROM users)
ON CONFLICT (anon_id) DO NOTHING;
