-- Create initial schema
CREATE TABLE IF NOT EXISTS link_cards (
    code TEXT PRIMARY KEY,
    owner_anon TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- active, used, revoked, expired
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_by TEXT -- the anon that used this code
);

CREATE TABLE IF NOT EXISTS trust_requests (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    from_anon TEXT NOT NULL,
    to_anon TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    anon_id TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS geo_pings (
    id SERIAL PRIMARY KEY,
    anon_id TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS post_daily_limits (
    anon_id TEXT NOT NULL,
    date_key TEXT NOT NULL, -- YYYY-MM-DD format
    count INT NOT NULL DEFAULT 0,
    PRIMARY KEY (anon_id, date_key)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_link_cards_owner ON link_cards(owner_anon);
CREATE INDEX IF NOT EXISTS idx_trust_requests_from ON trust_requests(from_anon);
CREATE INDEX IF NOT EXISTS idx_trust_requests_to ON trust_requests(to_anon);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_geo_pings_anon_timestamp ON geo_pings(anon_id, timestamp DESC);
