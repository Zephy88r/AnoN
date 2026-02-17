-- Add like/dislike columns to comment_replies table
ALTER TABLE comment_replies 
ADD COLUMN IF NOT EXISTS likes INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS dislikes INTEGER NOT NULL DEFAULT 0;

-- Create reply reactions table
CREATE TABLE IF NOT EXISTS reply_reactions (
    reply_id TEXT NOT NULL,
    anon_id TEXT NOT NULL,
    reaction TEXT NOT NULL CHECK(reaction IN ('like', 'dislike')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (reply_id, anon_id),
    FOREIGN KEY (reply_id) REFERENCES comment_replies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reply_reactions_anon_id ON reply_reactions(anon_id);
