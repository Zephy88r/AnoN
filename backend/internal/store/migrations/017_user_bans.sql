CREATE TABLE IF NOT EXISTS user_bans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anon_id TEXT NOT NULL,
    reason TEXT,
    banned_by TEXT NOT NULL,
    banned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_permanent BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_user_bans_anon_id ON user_bans(anon_id);
CREATE INDEX IF NOT EXISTS idx_user_bans_banned_at ON user_bans(banned_at DESC);
