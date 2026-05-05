-- News & Blog teasers (YouTube, podcasts, etc.) stored on the single site_content row.
-- Run in Supabase SQL editor if the project was created before this column existed.

alter table public.site_content
  add column if not exists news_spotlights jsonb not null default '[]'::jsonb;

comment on column public.site_content.news_spotlights is
  'Array of { id, snapshotUrl, snapshotKind, destinationUrl, description, buttonLabel } for /news';
