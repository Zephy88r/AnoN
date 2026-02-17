-- Ensure reply reactions are unique per user+reply and resync counters.

-- Remove duplicate reactions per (reply_id, anon_id), keep the most recent.
WITH ranked AS (
    SELECT
        ctid,
        reply_id,
        anon_id,
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY reply_id, anon_id
            ORDER BY created_at DESC, ctid DESC
        ) AS rn
    FROM reply_reactions
)
DELETE FROM reply_reactions rr
USING ranked r
WHERE rr.ctid = r.ctid
  AND r.rn > 1;

-- Add a unique constraint if one does not exist.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'reply_reactions_unique'
    ) THEN
        ALTER TABLE reply_reactions
        ADD CONSTRAINT reply_reactions_unique UNIQUE (reply_id, anon_id);
    END IF;
END $$;

-- Resync like/dislike counters from reply_reactions.
UPDATE comment_replies cr
SET likes = COALESCE(rr.likes, 0),
    dislikes = COALESCE(rr.dislikes, 0)
FROM (
    SELECT
        reply_id,
        COUNT(*) FILTER (WHERE reaction = 'like') AS likes,
        COUNT(*) FILTER (WHERE reaction = 'dislike') AS dislikes
    FROM reply_reactions
    GROUP BY reply_id
) rr
WHERE cr.id = rr.reply_id;

UPDATE comment_replies
SET likes = 0,
    dislikes = 0
WHERE id NOT IN (SELECT reply_id FROM reply_reactions);
