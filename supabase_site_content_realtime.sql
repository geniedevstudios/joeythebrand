-- ============================================================
-- SITE CONTENT + Supabase Realtime (News spotlights live updates)
-- Run in Supabase SQL Editor once per project if News edits don't push live.
--
-- Prerequisites:
--   1. Table must be in publication (see supabase_realtime_publication.sql):
--      ALTER PUBLICATION supabase_realtime ADD TABLE public.site_content;
--   2. Dashboard → Database → Replication → enable Realtime for `site_content`
--      if your project uses the UI toggle.
--
-- RLS: postgres_changes only sends rows the subscriber may SELECT.
-- `site_content_public_read` (FOR SELECT USING (true)) already allows anon +
-- authenticated clients to receive UPDATE payloads — no extra SELECT policy needed.
--
-- REPLICA IDENTITY FULL improves UPDATE event payloads so listeners reliably
-- see the full row (including JSON columns like news_spotlights).
-- ============================================================

ALTER TABLE public.site_content REPLICA IDENTITY FULL;
