-- Create comment replies table
CREATE TABLE IF NOT EXISTS comment_replies (
    id TEXT PRIMARY KEY,
    comment_id TEXT NOT NULL,
    anon_id TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN NOT NULL DEFAULT false,
    FOREIGN KEY (comment_id) REFERENCES post_comments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comment_replies_comment_id ON comment_replies(comment_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comment_replies_anon_id ON comment_replies(anon_id);
