-- Human-readable order numbers for customer support (e.g. JY-000421).
-- Run once in Supabase SQL Editor (or via migration). Safe to re-run: uses IF NOT EXISTS / DROP IF EXISTS where needed.

-- Sequence for numeric suffix (global, never resets per day)
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number text;

-- Backfill existing rows ordered by created_at
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS n
  FROM public.orders
  WHERE order_number IS NULL OR btrim(order_number) = ''
)
UPDATE public.orders o
SET order_number = 'JY-' || lpad(n::text, 6, '0')
FROM numbered
WHERE o.id = numbered.id;

-- Next insert must use max(existing)+1, or start at 000001 on an empty table
DO $$
DECLARE
  mx bigint;
BEGIN
  SELECT COALESCE(MAX(substring(order_number FROM 4)::bigint), 0)
  INTO mx
  FROM public.orders
  WHERE order_number ~ '^JY-[0-9]+$';

  IF mx >= 1 THEN
    PERFORM setval('public.order_number_seq', mx, true);
  ELSE
    PERFORM setval('public.order_number_seq', 1, false);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_unique ON public.orders (order_number);

ALTER TABLE public.orders
  ALTER COLUMN order_number SET NOT NULL;

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
