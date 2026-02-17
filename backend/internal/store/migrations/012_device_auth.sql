-- Device-based auth tables
CREATE TABLE IF NOT EXISTS devices (
    device_public_id TEXT PRIMARY KEY,
    device_secret_hash TEXT NOT NULL,
    anon_id TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS device_nonces (
    device_public_id TEXT NOT NULL,
    nonce TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (device_public_id, nonce)
);

CREATE INDEX IF NOT EXISTS idx_device_nonces_expires_at ON device_nonces(expires_at);
CREATE INDEX IF NOT EXISTS idx_devices_anon_id ON devices(anon_id);
