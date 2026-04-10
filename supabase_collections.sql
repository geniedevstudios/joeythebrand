-- Collections for admin "Create collections" tab — maps to products.category (slug).
-- Run in Supabase SQL Editor after products table exists.

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.collections enable row level security;

drop policy if exists "collections_public_read" on public.collections;
drop policy if exists "collections_auth_insert" on public.collections;
drop policy if exists "collections_auth_update" on public.collections;
drop policy if exists "collections_auth_delete" on public.collections;

create policy "collections_public_read" on public.collections for select using (true);
create policy "collections_auth_insert" on public.collections for insert with check (auth.role() = 'authenticated');
create policy "collections_auth_update" on public.collections for update using (auth.role() = 'authenticated');
create policy "collections_auth_delete" on public.collections for delete using (auth.role() = 'authenticated');

insert into public.collections (slug, name, description, sort_order) values
  ('always-lit', 'Always Lit', 'Available every season', 1),
  ('limited-edition', 'Limited Edition', 'Limited runs and archive pieces', 2),
  ('sample-sale', 'Sample Sale', 'Samples and specials', 3)
on conflict (slug) do nothing;
