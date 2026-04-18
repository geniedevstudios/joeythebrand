-- ============================================================
-- JOEY THE BRAND — One-shot repair: multi-admin dashboard access
-- Run in Supabase SQL Editor when:
--   • "Edit admin" only shows the owner, or
--   • A teammate signs in but revenue / orders / consultations look empty
--     (RLS was still using only joeythebrandonline@gmail.com in JWT policies).
--
-- Safe to run more than once (idempotent).
-- ============================================================

-- 1) Operator list + function (same as supabase_admin_operator_identity.sql)
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

-- 2) Register a teammate by Auth user id (replace UUID if needed; or DELETE this block and INSERT email manually)
INSERT INTO public.admin_operator_emails (email)
SELECT lower(trim(u.email))
FROM auth.users u
WHERE u.id = 'a4625836-7ca3-4b72-9853-e77216d00adf'::uuid
  AND u.email IS NOT NULL
ON CONFLICT (email) DO NOTHING;

-- 3) Re-apply admin policies (orders + consultations + settings)
DROP POLICY IF EXISTS "orders_select_admin" ON public.orders;
CREATE POLICY "orders_select_admin" ON public.orders
  FOR SELECT
  USING (public.is_admin_dashboard_user());

DROP POLICY IF EXISTS "orders_update_admin" ON public.orders;
CREATE POLICY "orders_update_admin" ON public.orders
  FOR UPDATE
  USING (public.is_admin_dashboard_user());

DROP POLICY IF EXISTS "consultation_bookings_select_admin" ON public.consultation_bookings;
CREATE POLICY "consultation_bookings_select_admin" ON public.consultation_bookings
  FOR SELECT
  USING (public.is_admin_dashboard_user());

DROP POLICY IF EXISTS "consultation_bookings_update_admin" ON public.consultation_bookings;
CREATE POLICY "consultation_bookings_update_admin" ON public.consultation_bookings
  FOR UPDATE
  USING (public.is_admin_dashboard_user());

DROP POLICY IF EXISTS "consultation_settings_update_admin" ON public.consultation_settings;
CREATE POLICY "consultation_settings_update_admin" ON public.consultation_settings
  FOR UPDATE
  USING (public.is_admin_dashboard_user());

DROP POLICY IF EXISTS "consultation_settings_insert_admin" ON public.consultation_settings;
CREATE POLICY "consultation_settings_insert_admin" ON public.consultation_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_dashboard_user());
