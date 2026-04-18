-- ============================================================
-- JOEY THE BRAND — Admin team: sync RLS policies to the operator list
-- Run in Supabase SQL Editor AFTER:
--   • supabase_admin_operator_identity.sql (defines admin_operator_emails + is_admin_dashboard_user), and
--   • Tables public.orders, public.consultation_bookings, public.consultation_settings exist.
--
-- WHY: Older SQL used only joeythebrandonline@gmail.com in JWT for admin policies.
-- Other dashboard logins then matched only "own" customer rows — revenue and consultations look empty.
--
-- Idempotent: safe to re-run (e.g. after re-applying an older migration file).
--
-- Add a teammate: insert their login email (lowercase):
--   INSERT INTO public.admin_operator_emails (email) VALUES ('teammate@yourdomain.com');
-- Remove access:
--   DELETE FROM public.admin_operator_emails WHERE email = '...';
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_operator_emails (
  email text PRIMARY KEY CHECK (email = lower(trim(email)))
);

ALTER TABLE public.admin_operator_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_operator_emails_no_access" ON public.admin_operator_emails;
CREATE POLICY "admin_operator_emails_no_access" ON public.admin_operator_emails
  FOR ALL
  USING (false)
  WITH CHECK (false);

INSERT INTO public.admin_operator_emails (email)
VALUES ('joeythebrandonline@gmail.com')
ON CONFLICT (email) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_admin_dashboard_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_operator_emails e
    WHERE e.email = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin_dashboard_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_dashboard_user() TO authenticated;

-- ─── Orders (same logic as supabase_orders_rls.sql) ─────────────────────────
DROP POLICY IF EXISTS "orders_select_admin" ON public.orders;
CREATE POLICY "orders_select_admin" ON public.orders
  FOR SELECT
  USING (public.is_admin_dashboard_user());

DROP POLICY IF EXISTS "orders_update_admin" ON public.orders;
CREATE POLICY "orders_update_admin" ON public.orders
  FOR UPDATE
  USING (public.is_admin_dashboard_user());

-- ─── Consultation bookings ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "consultation_bookings_select_admin" ON public.consultation_bookings;
CREATE POLICY "consultation_bookings_select_admin" ON public.consultation_bookings
  FOR SELECT
  USING (public.is_admin_dashboard_user());

DROP POLICY IF EXISTS "consultation_bookings_update_admin" ON public.consultation_bookings;
CREATE POLICY "consultation_bookings_update_admin" ON public.consultation_bookings
  FOR UPDATE
  USING (public.is_admin_dashboard_user());

-- ─── Consultation settings (max slots / day) ─────────────────────────────────
DROP POLICY IF EXISTS "consultation_settings_update_admin" ON public.consultation_settings;
CREATE POLICY "consultation_settings_update_admin" ON public.consultation_settings
  FOR UPDATE
  USING (public.is_admin_dashboard_user());

DROP POLICY IF EXISTS "consultation_settings_insert_admin" ON public.consultation_settings;
CREATE POLICY "consultation_settings_insert_admin" ON public.consultation_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_dashboard_user());
