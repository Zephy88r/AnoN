-- Add like/dislike counters to posts table
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS likes INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS dislikes INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT false;

-- Create table to track which users liked/disliked which posts
CREATE TABLE IF NOT EXISTS post_reactions (
    id SERIAL PRIMARY KEY,
    post_id TEXT NOT NULL,
    anon_id TEXT NOT NULL,
    reaction_type TEXT NOT NULL, -- 'like' or 'dislike'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, anon_id)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_anon ON post_reactions(anon_id);
