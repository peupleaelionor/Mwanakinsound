-- ============================================================
-- 0007 · Storage buckets & policies
-- storage/{avatars, artist-covers, album-covers, audio-preview, audio-master}
-- Audio masters live in a PRIVATE bucket (served via signed URLs / R2);
-- previews & images are public for fast, cacheable delivery.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',       'avatars',       true,   2 * 1024 * 1024,  array['image/jpeg','image/png','image/webp']),
  ('artist-covers', 'artist-covers', true,   5 * 1024 * 1024,  array['image/jpeg','image/png','image/webp']),
  ('album-covers',  'album-covers',  true,   5 * 1024 * 1024,  array['image/jpeg','image/png','image/webp']),
  ('audio-preview', 'audio-preview', true,  10 * 1024 * 1024,  array['audio/mpeg','audio/aac','audio/ogg']),
  ('audio-master',  'audio-master',  false, 50 * 1024 * 1024,  array['audio/mpeg','audio/aac','audio/flac','audio/wav'])
on conflict (id) do nothing;

-- Convention: object path is prefixed with the owning user's id:
--   avatars/{auth.uid()}/file.webp
-- The policies below enforce that a user can only write under their own prefix.

-- ---------- Public image buckets: world-readable, owner-writable ----------
create policy "public images are readable"
  on storage.objects for select
  using (bucket_id in ('avatars', 'artist-covers', 'album-covers', 'audio-preview'));

create policy "users upload to own image folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('avatars', 'artist-covers', 'album-covers', 'audio-preview')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users update own images"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('avatars', 'artist-covers', 'album-covers', 'audio-preview')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users delete own images"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('avatars', 'artist-covers', 'album-covers', 'audio-preview')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------- Private master bucket: owner-only, no public read ----------
create policy "owners read own masters"
  on storage.objects for select to authenticated
  using (bucket_id = 'audio-master' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "owners upload own masters"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'audio-master' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "owners delete own masters"
  on storage.objects for delete to authenticated
  using (bucket_id = 'audio-master' and (storage.foldername(name))[1] = auth.uid()::text);
