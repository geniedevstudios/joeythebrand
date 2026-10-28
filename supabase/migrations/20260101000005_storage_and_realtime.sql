-- ============================================================
-- JOEY THE BRAND — 00005: Storage Bucket (site-assets) & Realtime Publication
-- ============================================================

-- 1. Storage Bucket & Admin-only Write Policies
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('site-assets', 'site-assets', true, 52428800)
ON CONFLICT (id) DO UPDATE SET public = excluded.public;

DROP POLICY IF EXISTS "site_assets_public_read" ON storage.objects;
DROP POLICY IF EXISTS "site_assets_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "site_assets_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "site_assets_authenticated_delete" ON storage.objects;
DROP POLICY IF EXISTS "site_assets_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "site_assets_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "site_assets_admin_delete" ON storage.objects;

CREATE POLICY "site_assets_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site-assets');

CREATE POLICY "site_assets_admin_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-assets' AND public.is_admin_dashboard_user());

CREATE POLICY "site_assets_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'site-assets' AND public.is_admin_dashboard_user());

CREATE POLICY "site_assets_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'site-assets' AND public.is_admin_dashboard_user());

-- 2. Realtime Publication
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'products',
    'collections',
    'site_content',
    'promotion_codes',
    'events',
    'events_page',
    'orders',
    'consultation_bookings',
    'consultation_settings',
    'consultation_day_rules',
    'portfolio_realtime_bumps'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
