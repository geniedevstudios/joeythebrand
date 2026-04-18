-- ============================================================
-- JOEY THE BRAND — Orders RLS (run after supabase_migration.sql)
-- Supabase Dashboard → SQL Editor → paste and run
-- ============================================================
-- PREREQUISITE (dashboard team / multi-admin):
--   Run supabase_admin_operator_identity.sql FIRST so public.admin_operator_emails and
--   public.is_admin_dashboard_user() exist. Without that, this script will error.
--
-- Replaces broad "any authenticated user can read all orders" with:
--   • Customers: SELECT only rows where user_id = auth.uid()
--   • Admins: SELECT/UPDATE all rows when JWT email is listed in admin_operator_emails
--   • INSERT: guests must leave user_id null; signed-in users must set user_id = auth.uid()

DROP POLICY IF EXISTS "orders_public_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_auth_read" ON public.orders;
DROP POLICY IF EXISTS "orders_auth_update" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_guest_or_self" ON public.orders;
DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
DROP POLICY IF EXISTS "orders_select_admin" ON public.orders;
DROP POLICY IF EXISTS "orders_update_admin" ON public.orders;

CREATE POLICY "orders_insert_guest_or_self" ON public.orders
  FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "orders_select_own" ON public.orders
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "orders_select_admin" ON public.orders
  FOR SELECT
  USING (public.is_admin_dashboard_user());

CREATE POLICY "orders_update_admin" ON public.orders
  FOR UPDATE
  USING (public.is_admin_dashboard_user());
