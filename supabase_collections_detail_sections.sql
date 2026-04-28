-- Optional rich sections for /collection/[slug]
-- Run in Supabase SQL Editor after `public.collections` exists.

alter table public.collections
  add column if not exists detail_writeup text not null default '',
  add column if not exists detail_video_url text not null default '',
  add column if not exists detail_video_poster_url text not null default '',
  add column if not exists detail_gallery_urls text[] not null default '{}'::text[];

