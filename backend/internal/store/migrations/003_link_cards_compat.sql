-- Link cards compatibility
ALTER TABLE public.link_cards
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS expires_at timestamptz NULL,
    ADD COLUMN IF NOT EXISTS used_by text NULL;

ALTER TABLE public.link_cards
    ADD COLUMN IF NOT EXISTS id uuid;

UPDATE public.link_cards
SET status = 'active'
WHERE status IS NULL;

UPDATE public.link_cards
SET created_at = now()
WHERE created_at IS NULL;

UPDATE public.link_cards
SET id = '00000000-0000-0000-0000-000000000000'
WHERE id IS NULL;

ALTER TABLE public.link_cards
    ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.link_cards
    ALTER COLUMN id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS link_cards_code_uq ON public.link_cards(code);
