-- Full-screen promotion modal config (single row on site_content).
alter table public.site_content
  add column if not exists promotion_popup jsonb not null default '{}'::jsonb;

comment on column public.site_content.promotion_popup is
  'JSON: { enabled, imageUrl, headline, body, buttonLabel, action: newsletter|product|news, productSlugOrId }';
