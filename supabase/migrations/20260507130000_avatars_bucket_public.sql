-- 2026-05-07 — make the avatars bucket public.
--
-- Avatars are non-sensitive and we store cache-busted public URLs on
-- profiles.avatar_url, so the bucket needs to be public for the URL to be
-- loadable on the client. The avatars_write RLS policy still gates uploads
-- to profiles/<auth.uid()>/* and clinics/<owned-clinic-id>/* (already in
-- place from the storage_buckets migration).

UPDATE storage.buckets SET public = true WHERE name = 'avatars';
