-- ============================================================
-- JOEY THE BRAND — Realtime: add tables to supabase_realtime publication
-- Run once in Supabase SQL Editor if the dashboard toggle alone is not enough.
-- Client code subscribes via postgres_changes; tables must be in this publication.
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_content;
ALTER PUBLICATION supabase_realtime ADD TABLE public.promotion_codes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.consultation_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.consultation_settings;

-- If a table was already added, you may see an error — safe to ignore that row.
