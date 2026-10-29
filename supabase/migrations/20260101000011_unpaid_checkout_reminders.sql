-- ============================================================
-- JOEY THE BRAND — Unpaid checkout follow-up (customer + admin)
-- ============================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS unpaid_nudge_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS unpaid_nudge_resend_ids jsonb;

ALTER TABLE public.carts
  ADD COLUMN IF NOT EXISTS checkout_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS checkout_nudge_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS checkout_nudge_resend_ids jsonb;

CREATE INDEX IF NOT EXISTS orders_unpaid_nudge_idx
  ON public.orders (created_at)
  WHERE payment_status IS DISTINCT FROM 'paid' AND unpaid_nudge_sent_at IS NULL;

CREATE OR REPLACE FUNCTION public.carts_before_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := timezone('utc'::text, now());
  IF TG_OP = 'UPDATE' AND NEW.items IS DISTINCT FROM OLD.items THEN
    NEW.abandoned_email_sent_at := NULL;
    NEW.checkout_nudge_sent_at := NULL;
    NEW.checkout_nudge_resend_ids := NULL;
  END IF;
  RETURN NEW;
END;
$$;
