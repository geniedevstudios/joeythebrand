-- ============================================================
-- JOEY THE BRAND — 00003: Orders, Order Number Sequence & DHL Tracking
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS public.order_number_seq;

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  shipping_address text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]',
  total numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  promotion_code text,
  payment_status text DEFAULT 'unpaid',
  payment_ref text,
  status text NOT NULL DEFAULT 'pending',
  user_id uuid REFERENCES auth.users(id),
  notes text,
  dhl_tracking_number text,
  dhl_label_url text,
  dhl_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.orders_assign_order_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.order_number IS NULL OR btrim(NEW.order_number) = '' THEN
    NEW.order_number := 'JY-' || lpad(nextval('public.order_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_assign_order_number ON public.orders;
CREATE TRIGGER orders_assign_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE PROCEDURE public.orders_assign_order_number();

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

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
