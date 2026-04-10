-- ============================================================
-- Public bucket for admin-uploaded site images/videos (hero, about, etc.)
-- Run in Supabase SQL Editor after project exists.
-- You can also create "site-assets" in Dashboard → Storage → New bucket → Public.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('site-assets', 'site-assets', true, 52428800)
on conflict (id) do update set public = excluded.public;

-- Policies on storage.objects (idempotent)
drop policy if exists "site_assets_public_read" on storage.objects;
drop policy if exists "site_assets_authenticated_insert" on storage.objects;
drop policy if exists "site_assets_authenticated_update" on storage.objects;
drop policy if exists "site_assets_authenticated_delete" on storage.objects;

create policy "site_assets_public_read"
  on storage.objects for select
  using (bucket_id = 'site-assets');

create policy "site_assets_authenticated_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'site-assets');

create policy "site_assets_authenticated_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'site-assets');

create policy "site_assets_authenticated_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'site-assets');
