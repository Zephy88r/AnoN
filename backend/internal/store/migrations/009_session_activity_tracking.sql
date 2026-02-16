-- Add last activity tracking for sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE;

-- Initialize last_activity_at for existing sessions
UPDATE sessions SET last_activity_at = issued_at WHERE last_activity_at IS NULL;

-- Add index for cleanup of expired sessions
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity_at);
