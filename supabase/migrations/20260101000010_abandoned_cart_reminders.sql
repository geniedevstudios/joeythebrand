-- ============================================================
-- JOEY THE BRAND — Abandoned cart reminder tracking
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS carts_user_id_key ON public.carts (user_id);

ALTER TABLE public.carts
  ADD COLUMN IF NOT EXISTS abandoned_email_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS carts_abandoned_idle_idx
  ON public.carts (updated_at)
  WHERE jsonb_typeof(items) = 'array' AND jsonb_array_length(items) > 0;

CREATE OR REPLACE FUNCTION public.carts_before_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := timezone('utc'::text, now());
  IF TG_OP = 'UPDATE' AND NEW.items IS DISTINCT FROM OLD.items THEN
    NEW.abandoned_email_sent_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS carts_before_write ON public.carts;
CREATE TRIGGER carts_before_write
  BEFORE INSERT OR UPDATE ON public.carts
  FOR EACH ROW
  EXECUTE PROCEDURE public.carts_before_write();
