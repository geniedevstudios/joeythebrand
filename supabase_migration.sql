-- ============================================================
-- JOEY THE BRAND — Supabase Schema Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
--
-- Safe to re-run: policies are dropped first so "already exists" errors
-- are avoided. If you replaced orders RLS with supabase_orders_rls.sql,
-- re-running this file will recreate the original orders policies too;
-- run supabase_orders_rls.sql again afterward if you need the stricter rules.
-- ============================================================

-- 1. PRODUCTS TABLE
create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null,
  category_name text not null,
  price numeric not null,
  original_price numeric,
  image text not null default '',
  images text[] not null default '{}',
  description text not null default '',
  details text[] not null default '{}',
  sizes jsonb not null default '[]',
  is_out_of_stock boolean not null default false,
  is_limited boolean not null default false,
  is_best_seller boolean not null default false,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2. PROMOTION CODES TABLE
create table if not exists public.promotion_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  percentage integer not null,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- 3. ORDERS TABLE
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  shipping_address text not null,
  items jsonb not null default '[]',
  total numeric not null default 0,
  discount numeric not null default 0,
  promotion_code text,
  status text not null default 'pending',
  user_id uuid references auth.users(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Friendly order ref (JY-000001): add column here for fresh installs; run supabase_orders_order_number.sql for sequence, trigger, backfill.
alter table public.orders add column if not exists order_number text;

-- 4. SITE CONTENT TABLE (single row, always id = 1)
create table if not exists public.site_content (
  id integer primary key default 1 check (id = 1),
  hero_image text not null default '',
  hero_title text not null default 'JOEY THE BRAND',
  hero_subtitle text not null default 'Contemporary fashion redefining modern silhouettes',
  about_image text not null default '/founder.png',
  about_text text not null default 'JOEY THE BRAND is a contemporary fashion house redefining modern silhouettes through structure, symbolism, and unapologetic identity.',
  featured_product_ids text[] not null default '{}',
  page_heroes jsonb not null default '{}'::jsonb,
  founder_video_url text not null default '',
  founder_video_poster_url text not null default '',
  founder_kicker text not null default 'BEHIND THE PATTERN',
  founder_headline text not null default 'An intimate look at the craft behind every design.',
  founder_cta_label text not null default 'DISCOVER THE STORY',
  founder_cta_href text not null default '/story'
);

alter table public.site_content add column if not exists founder_video_url text not null default '';
alter table public.site_content add column if not exists founder_video_poster_url text not null default '';
alter table public.site_content add column if not exists founder_kicker text not null default 'BEHIND THE PATTERN';
alter table public.site_content add column if not exists founder_headline text not null default 'An intimate look at the craft behind every design.';
alter table public.site_content add column if not exists founder_cta_label text not null default 'DISCOVER THE STORY';
alter table public.site_content add column if not exists founder_cta_href text not null default '/story';

-- 5. EVENTS PAGE (single row, always id = 1)
create table if not exists public.events_page (
  id integer primary key default 1 check (id = 1),
  heading text not null default 'Events',
  subheading text,
  body text,
  top_video_url text,
  top_video_poster_url text,
  updated_at timestamptz not null default now()
);

-- 6. EVENTS (upcoming + past)
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null default 'fashion_shows',
  status text not null default 'upcoming', -- upcoming | past
  location text,
  start_at timestamptz,
  date_label text,
  description text,
  details text,
  details_ready boolean not null default false,
  main_video_url text,
  main_video_poster_url text,
  flyer_url text,
  gallery_urls text[] not null default '{}'::text[],
  recap_youtube_url text,
  pixieset_url text,
  collection_slugs text[] not null default '{}'::text[],
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Existing projects: flyer image used for card background
alter table public.events
  add column if not exists flyer_url text;

-- Existing projects: event gallery images
alter table public.events
  add column if not exists gallery_urls text[] not null default '{}'::text[];

-- Still image while main show MP4 loads on /events/[slug]
alter table public.events add column if not exists main_video_poster_url text;

-- Existing projects created before page_heroes was added:
alter table public.site_content
  add column if not exists page_heroes jsonb not null default '{}'::jsonb;

-- ============================================================
-- RLS POLICIES
-- ============================================================

alter table public.products enable row level security;
alter table public.promotion_codes enable row level security;
alter table public.orders enable row level security;
alter table public.site_content enable row level security;
alter table public.events_page enable row level security;
alter table public.events enable row level security;

-- PRODUCTS: anyone can read, only authenticated users can write
drop policy if exists "products_public_read" on public.products;
drop policy if exists "products_auth_insert" on public.products;
drop policy if exists "products_auth_update" on public.products;
drop policy if exists "products_auth_delete" on public.products;
create policy "products_public_read" on public.products for select using (true);
create policy "products_auth_insert" on public.products for insert with check (auth.role() = 'authenticated');
create policy "products_auth_update" on public.products for update using (auth.role() = 'authenticated');
create policy "products_auth_delete" on public.products for delete using (auth.role() = 'authenticated');

-- PROMOTION CODES: anyone can read (needed for checkout), only authenticated can write
drop policy if exists "promos_public_read" on public.promotion_codes;
drop policy if exists "promos_auth_insert" on public.promotion_codes;
drop policy if exists "promos_auth_update" on public.promotion_codes;
drop policy if exists "promos_auth_delete" on public.promotion_codes;
create policy "promos_public_read" on public.promotion_codes for select using (true);
create policy "promos_auth_insert" on public.promotion_codes for insert with check (auth.role() = 'authenticated');
create policy "promos_auth_update" on public.promotion_codes for update using (auth.role() = 'authenticated');
create policy "promos_auth_delete" on public.promotion_codes for delete using (auth.role() = 'authenticated');

-- ORDERS: anyone can insert (no login needed for checkout), authenticated can read/update all
drop policy if exists "orders_public_insert" on public.orders;
drop policy if exists "orders_auth_read" on public.orders;
drop policy if exists "orders_auth_update" on public.orders;
create policy "orders_public_insert" on public.orders for insert with check (true);
create policy "orders_auth_read" on public.orders for select using (auth.role() = 'authenticated');
create policy "orders_auth_update" on public.orders for update using (auth.role() = 'authenticated');

-- SITE CONTENT: anyone can read, only authenticated can write
drop policy if exists "site_content_public_read" on public.site_content;
drop policy if exists "site_content_auth_update" on public.site_content;
drop policy if exists "site_content_auth_insert" on public.site_content;
create policy "site_content_public_read" on public.site_content for select using (true);
create policy "site_content_auth_update" on public.site_content for update using (auth.role() = 'authenticated');
create policy "site_content_auth_insert" on public.site_content for insert with check (auth.role() = 'authenticated');

-- EVENTS PAGE: anyone can read, only authenticated can write
drop policy if exists "events_page_public_read" on public.events_page;
drop policy if exists "events_page_auth_update" on public.events_page;
drop policy if exists "events_page_auth_insert" on public.events_page;
create policy "events_page_public_read" on public.events_page for select using (true);
create policy "events_page_auth_update" on public.events_page for update using (auth.role() = 'authenticated');
create policy "events_page_auth_insert" on public.events_page for insert with check (auth.role() = 'authenticated');

-- EVENTS: anyone can read, only authenticated can write
drop policy if exists "events_public_read" on public.events;
drop policy if exists "events_auth_insert" on public.events;
drop policy if exists "events_auth_update" on public.events;
drop policy if exists "events_auth_delete" on public.events;
create policy "events_public_read" on public.events for select using (true);
create policy "events_auth_insert" on public.events for insert with check (auth.role() = 'authenticated');
create policy "events_auth_update" on public.events for update using (auth.role() = 'authenticated');
create policy "events_auth_delete" on public.events for delete using (auth.role() = 'authenticated');

-- ============================================================
-- SEED DATA — Essential Site Initialization 
-- ============================================================

-- Seed site content (single row) so the homepage has baseline copy
insert into public.site_content (id, hero_image, hero_title, hero_subtitle, about_image, about_text, featured_product_ids)
values (
  1, '', 'JOEY THE BRAND', 'Contemporary fashion redefining modern silhouettes',
  '/founder.png',
  'JOEY THE BRAND is a contemporary fashion house redefining modern silhouettes through structure, symbolism, and unapologetic identity.',
  '{}'
)
on conflict (id) do nothing;

insert into public.events_page (id, heading)
values (1, 'Events')
on conflict (id) do nothing;

-- Optional still image while the /events top MP4 loads (matches site_content.hero_image pattern for home hero)
alter table public.events_page add column if not exists top_video_poster_url text;

-- ============================================================
-- Admin login — DO NOT insert into auth.users via SQL
-- ============================================================
-- Manual auth.users / auth.identities inserts often cause HTTP 500 on
-- POST /auth/v1/token?grant_type=password (GoTrue cannot verify the row).
-- Create the admin in the Dashboard instead:
--   Authentication → Users → Add user → Email + password
--   Enable "Auto Confirm User" so sign-in works immediately.
-- Match the email used in supabase_orders_rls.sql (admin SELECT/UPDATE policy).
