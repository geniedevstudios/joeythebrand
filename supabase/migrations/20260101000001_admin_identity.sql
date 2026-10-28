-- ============================================================
-- JOEY THE BRAND — 00001: Admin Operator Identity & Access Function
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
