-- Create post_reports table to track reported posts
CREATE TABLE IF NOT EXISTS public.post_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  reported_anon_id TEXT NOT NULL,
  reporter_anon_id TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, reporter_anon_id)
);

CREATE INDEX IF NOT EXISTS idx_post_reports_post_id ON public.post_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_reported_anon_id ON public.post_reports(reported_anon_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_created_at ON public.post_reports(created_at);
