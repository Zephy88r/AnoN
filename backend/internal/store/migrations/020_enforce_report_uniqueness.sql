-- Ensure reports are idempotent per reporter-target pair by cleaning duplicates
-- and enforcing unique indexes. This protects against repeated spam reports.

-- Keep the newest profile report per (reporter, target user)
DELETE FROM reports r
USING reports r2
WHERE r.target_type = 'profile'
  AND r2.target_type = 'profile'
  AND r.reporter_anon_id = r2.reporter_anon_id
  AND r.target_user_anon_id = r2.target_user_anon_id
  AND r.ctid < r2.ctid;

-- Keep the newest post report per (reporter, target post)
DELETE FROM reports r
USING reports r2
WHERE r.target_type = 'post'
  AND r2.target_type = 'post'
  AND r.reporter_anon_id = r2.reporter_anon_id
  AND r.target_post_id = r2.target_post_id
  AND r.ctid < r2.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS ux_reports_profile_unique
    ON reports (reporter_anon_id, target_type, target_user_anon_id)
    WHERE target_type = 'profile';

CREATE UNIQUE INDEX IF NOT EXISTS ux_reports_post_unique
    ON reports (reporter_anon_id, target_type, target_post_id)
    WHERE target_type = 'post';
