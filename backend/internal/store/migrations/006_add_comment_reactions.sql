-- Add reaction counts to comments
ALTER TABLE post_comments
    ADD COLUMN IF NOT EXISTS likes INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS dislikes INTEGER NOT NULL DEFAULT 0;

-- Track per-user reactions to comments
CREATE TABLE IF NOT EXISTS comment_reactions (
    comment_id TEXT NOT NULL,
    anon_id TEXT NOT NULL,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (comment_id, anon_id),
    FOREIGN KEY (comment_id) REFERENCES post_comments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_anon_id ON comment_reactions(anon_id);
