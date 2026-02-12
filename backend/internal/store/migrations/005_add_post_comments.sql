-- Create comments table
CREATE TABLE IF NOT EXISTS post_comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    anon_id TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN NOT NULL DEFAULT false,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Create index for efficient comment lookups
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_post_comments_anon_id ON post_comments(anon_id);
