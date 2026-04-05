-- Shop filters: men's / women's / all (unisex appears in both gender filters)
-- Run in Supabase SQL Editor.

alter table public.products add column if not exists wear_tag text not null default 'unisex';

-- Optional: restrict values (comment out if you prefer free text)
-- alter table public.products drop constraint if exists products_wear_tag_check;
-- alter table public.products add constraint products_wear_tag_check
--   check (wear_tag in ('mens', 'womens', 'unisex'));
