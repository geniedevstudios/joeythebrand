-- Add short copy for home / heroes; existing `description` is the long-form story on /collection/[slug].
-- Run in Supabase SQL Editor after `supabase_collections.sql`.

alter table public.collections
  add column if not exists brief_description text not null default '';

-- One-time: copy legacy single field into brief so nothing goes blank until you edit in admin.
update public.collections
set brief_description = description
where brief_description = '' and coalesce(trim(description), '') <> '';
