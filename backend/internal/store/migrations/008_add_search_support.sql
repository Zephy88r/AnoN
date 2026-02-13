-- Add full-text search support for posts
-- This migration adds GIN indexes and tsvector columns for efficient searching

-- Add a tsvector column for full-text search
ALTER TABLE posts ADD COLUMN IF NOT EXISTS text_search tsvector;

-- Create a function to update the search vector
CREATE OR REPLACE FUNCTION posts_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.text_search := to_tsvector('english', coalesce(NEW.text, ''));
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector
DROP TRIGGER IF EXISTS posts_search_update ON posts;
CREATE TRIGGER posts_search_update
  BEFORE INSERT OR UPDATE OF text ON posts
  FOR EACH ROW
  EXECUTE FUNCTION posts_search_trigger();

-- Update existing posts with search vectors
UPDATE posts SET text_search = to_tsvector('english', coalesce(text, ''));

-- Create GIN index for full-text search (for keyword search)
CREATE INDEX IF NOT EXISTS idx_posts_text_search ON posts USING GIN(text_search);

-- Create GIN index for pattern matching with pg_trgm (for typo tolerance and fuzzy matching)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_posts_text_trgm ON posts USING GIN(text gin_trgm_ops);

-- Create index for sorting by relevance + recency
CREATE INDEX IF NOT EXISTS idx_posts_created_at_desc ON posts(created_at DESC);

-- Add hashtag extraction support
-- We'll store hashtags in a separate normalized format for efficient filtering
ALTER TABLE posts ADD COLUMN IF NOT EXISTS hashtags TEXT[];

-- Create function to extract hashtags from text
CREATE OR REPLACE FUNCTION extract_hashtags(text_content TEXT) RETURNS TEXT[] AS $$
DECLARE
  hashtag_array TEXT[];
BEGIN
  -- Extract all hashtags (words starting with #)
  SELECT ARRAY(
    SELECT DISTINCT lower(regexp_replace(match[1], '^#', ''))
    FROM regexp_matches(text_content, '#(\w+)', 'g') AS match
  ) INTO hashtag_array;
  
  RETURN COALESCE(hashtag_array, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update trigger to also extract hashtags
CREATE OR REPLACE FUNCTION posts_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.text_search := to_tsvector('english', coalesce(NEW.text, ''));
  NEW.hashtags := extract_hashtags(NEW.text);
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Update existing posts with hashtags
UPDATE posts SET hashtags = extract_hashtags(text);

-- Create GIN index for hashtag array search
CREATE INDEX IF NOT EXISTS idx_posts_hashtags ON posts USING GIN(hashtags);

-- Create index for anon_id (useful for filtering own posts)
CREATE INDEX IF NOT EXISTS idx_posts_anon_id ON posts(anon_id);
