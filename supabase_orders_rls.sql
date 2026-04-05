-- ============================================================
-- JOEY THE BRAND — Orders RLS (run after supabase_migration.sql)
-- Supabase Dashboard → SQL Editor → paste and run
-- ============================================================
-- Replaces broad "any authenticated user can read all orders" with:
--   • Customers: SELECT only rows where user_id = auth.uid()
--   • Admin: SELECT/UPDATE all rows (JWT email must match your admin login)
--   • INSERT: guests must leave user_id null; signed-in users must set user_id = auth.uid()
--
-- If your admin email is not joeythebrandonline@gmail.com, replace all three occurrences below.

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
  USING ((auth.jwt() ->> 'email')::text = 'joeythebrandonline@gmail.com');

CREATE POLICY "orders_update_admin" ON public.orders
  FOR UPDATE
  USING ((auth.jwt() ->> 'email')::text = 'joeythebrandonline@gmail.com');
