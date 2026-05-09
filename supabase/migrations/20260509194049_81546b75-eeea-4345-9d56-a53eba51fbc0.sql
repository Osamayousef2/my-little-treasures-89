ALTER TABLE public.album_items
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_album_items_tags
  ON public.album_items USING GIN (tags);