-- Add per-page hero backgrounds (and optional home video) to site_content.
-- Run in Supabase SQL Editor if you already applied supabase_migration.sql.

alter table public.site_content
  add column if not exists page_heroes jsonb not null default '{}'::jsonb;

comment on column public.site_content.page_heroes is
  'JSON map of page keys (home, shop, story, …) to { kind: image|video, src: url }.';
