-- Newsletter subscribers: store in Supabase; sync to Brevo from your API (service role).
-- Run in Supabase SQL Editor.

create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now(),
  constraint subscribers_email_key unique (email)
);

create index if not exists subscribers_email_idx on public.subscribers (lower(email));

comment on table public.subscribers is 'Footer newsletter signups; inserted only via server with SUPABASE_SERVICE_ROLE_KEY.';

alter table public.subscribers enable row level security;

-- No policies for anon/authenticated: only service_role (bypasses RLS) may access from API.
revoke all on public.subscribers from public;
grant select, insert, update, delete on public.subscribers to service_role;
