
-- Children table
create table public.children (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  birth_date date,
  avatar_url text,
  color text default 'pink',
  created_at timestamptz not null default now()
);
alter table public.children enable row level security;
create policy "own children select" on public.children for select using (auth.uid() = user_id);
create policy "own children insert" on public.children for insert with check (auth.uid() = user_id);
create policy "own children update" on public.children for update using (auth.uid() = user_id);
create policy "own children delete" on public.children for delete using (auth.uid() = user_id);

-- Album items
create type public.item_type as enum ('drawing','certificate','photo','video');

create table public.album_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  type public.item_type not null,
  title text,
  description text,
  file_url text not null,
  thumbnail_url text,
  item_date date default current_date,
  created_at timestamptz not null default now()
);
alter table public.album_items enable row level security;
create policy "own items select" on public.album_items for select using (auth.uid() = user_id);
create policy "own items insert" on public.album_items for insert with check (auth.uid() = user_id);
create policy "own items update" on public.album_items for update using (auth.uid() = user_id);
create policy "own items delete" on public.album_items for delete using (auth.uid() = user_id);

create index album_items_child_idx on public.album_items(child_id, type);

-- Storage bucket
insert into storage.buckets (id, name, public) values ('album','album', true)
on conflict (id) do nothing;

create policy "album read public" on storage.objects for select using (bucket_id = 'album');
create policy "album owner insert" on storage.objects for insert with check (
  bucket_id = 'album' and auth.uid()::text = (storage.foldername(name))[1]
);
create policy "album owner update" on storage.objects for update using (
  bucket_id = 'album' and auth.uid()::text = (storage.foldername(name))[1]
);
create policy "album owner delete" on storage.objects for delete using (
  bucket_id = 'album' and auth.uid()::text = (storage.foldername(name))[1]
);
