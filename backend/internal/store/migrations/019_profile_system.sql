ALTER TABLE users
    ADD COLUMN IF NOT EXISTS username TEXT,
    ADD COLUMN IF NOT EXISTS username_suffix TEXT,
    ADD COLUMN IF NOT EXISTS username_normalized TEXT,
    ADD COLUMN IF NOT EXISTS bio TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS region TEXT,
    ADD COLUMN IF NOT EXISTS is_region_public BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS trust_score INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS status_label TEXT NOT NULL DEFAULT 'Clean',
    ADD COLUMN IF NOT EXISTS profile_views INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS posts_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS comments_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reactions_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS username_changed_at TIMESTAMPTZ;

UPDATE users u
SET
    username = d.username,
    username_suffix = regexp_replace(lower(d.username), '^ghost_', ''),
    username_normalized = lower(d.username),
    created_at = LEAST(u.created_at, d.created_at)
FROM devices d
WHERE u.anon_id = d.anon_id
  AND (u.username IS NULL OR u.username = '' OR u.username_normalized IS NULL OR u.username_normalized = '');

DO $$
DECLARE
    user_record RECORD;
    candidate_suffix TEXT;
    candidate_username TEXT;
    candidate_normalized TEXT;
    attempt INT;
    max_attempts INT := 32;
BEGIN
    FOR user_record IN
        SELECT anon_id
        FROM users
        WHERE username IS NULL OR username = '' OR username_suffix IS NULL OR username_suffix = '' OR username_normalized IS NULL OR username_normalized = ''
    LOOP
        attempt := 0;
        LOOP
            candidate_suffix := lower(substr(md5(user_record.anon_id || ':' || attempt::text), 1, 8));
            candidate_username := 'ghost_' || candidate_suffix;
            candidate_normalized := lower(candidate_username);

            BEGIN
                UPDATE users
                SET username = candidate_username,
                    username_suffix = candidate_suffix,
                    username_normalized = candidate_normalized
                WHERE anon_id = user_record.anon_id;
                EXIT;
            EXCEPTION
                WHEN unique_violation THEN
                    attempt := attempt + 1;
                    IF attempt >= max_attempts THEN
                        RAISE EXCEPTION 'failed to backfill username for anon_id=%', user_record.anon_id;
                    END IF;
            END;
        END LOOP;
    END LOOP;
END $$;

ALTER TABLE users
    ALTER COLUMN username SET NOT NULL,
    ALTER COLUMN username_suffix SET NOT NULL,
    ALTER COLUMN username_normalized SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_username_pattern'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT chk_users_username_pattern
            CHECK (username ~ '^ghost_[a-z0-9_]{3,20}$');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_username_suffix_pattern'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT chk_users_username_suffix_pattern
            CHECK (username_suffix ~ '^[a-z0-9_]{3,20}$');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_username_normalized'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT chk_users_username_normalized
            CHECK (username_normalized = lower(username));
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_username ON users (username);
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_username_normalized ON users (username_normalized);
CREATE INDEX IF NOT EXISTS idx_users_status_label ON users (status_label);

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_anon_id TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('profile', 'post')),
    target_user_anon_id TEXT NOT NULL,
    target_post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
    reason TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_reports_target_shape CHECK (
        (target_type = 'profile' AND target_post_id IS NULL)
        OR (target_type = 'post' AND target_post_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_reports_target_user ON reports (target_user_anon_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_target_post ON reports (target_post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports (reporter_anon_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS ux_reports_profile_unique
    ON reports (reporter_anon_id, target_type, target_user_anon_id)
    WHERE target_type = 'profile';

CREATE UNIQUE INDEX IF NOT EXISTS ux_reports_post_unique
    ON reports (reporter_anon_id, target_type, target_post_id)
    WHERE target_type = 'post';
