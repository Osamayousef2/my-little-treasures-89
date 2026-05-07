ALTER TYPE public.item_type ADD VALUE IF NOT EXISTS 'school';
ALTER TYPE public.item_type ADD VALUE IF NOT EXISTS 'note';

ALTER TABLE public.album_items ALTER COLUMN child_id DROP NOT NULL;
ALTER TABLE public.album_items ALTER COLUMN file_url DROP NOT NULL;