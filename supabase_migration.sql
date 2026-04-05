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
  image text not null default '/lookbook.png',
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
  hero_image text not null default '/hero.png',
  hero_title text not null default 'JOEY THE BRAND',
  hero_subtitle text not null default 'Contemporary fashion redefining modern silhouettes',
  about_image text not null default '/founder.png',
  about_text text not null default 'JOEY THE BRAND is a contemporary fashion house redefining modern silhouettes through structure, symbolism, and unapologetic identity.',
  featured_product_ids text[] not null default '{}',
  page_heroes jsonb not null default '{}'::jsonb
);

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

-- ============================================================
-- SEED DATA — Essential Site Initialization 
-- ============================================================

-- Seed site content (single row) so the homepage has baseline copy
insert into public.site_content (id, hero_image, hero_title, hero_subtitle, about_image, about_text, featured_product_ids)
values (
  1, '/hero.png', 'JOEY THE BRAND', 'Contemporary fashion redefining modern silhouettes',
  '/founder.png',
  'JOEY THE BRAND is a contemporary fashion house redefining modern silhouettes through structure, symbolism, and unapologetic identity.',
  '{}'
)
on conflict (id) do nothing;

-- ============================================================
-- Admin login — DO NOT insert into auth.users via SQL
-- ============================================================
-- Manual auth.users / auth.identities inserts often cause HTTP 500 on
-- POST /auth/v1/token?grant_type=password (GoTrue cannot verify the row).
-- Create the admin in the Dashboard instead:
--   Authentication → Users → Add user → Email + password
--   Enable "Auto Confirm User" so sign-in works immediately.
-- Match the email used in supabase_orders_rls.sql (admin SELECT/UPDATE policy).
