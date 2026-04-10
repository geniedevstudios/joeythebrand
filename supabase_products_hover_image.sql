-- Optional image shown on product card hover (shop grid, wishlist, etc.)
-- Run in Supabase SQL Editor.

alter table public.products add column if not exists hover_image text;
