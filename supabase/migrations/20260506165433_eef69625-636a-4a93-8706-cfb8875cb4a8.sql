
update storage.buckets set public = false where id = 'album';
drop policy if exists "album read public" on storage.objects;
create policy "album owner select" on storage.objects for select using (
  bucket_id = 'album' and auth.uid()::text = (storage.foldername(name))[1]
);
