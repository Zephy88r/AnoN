-- Trending posts performance indexes
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id_reaction ON post_reactions(post_id, reaction_type);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON post_comments(post_id);
