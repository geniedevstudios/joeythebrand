-- ============================================================
-- JOEY THE BRAND — Bespoke / consultation bookings
-- Run in Supabase SQL Editor after auth is configured.
-- Admin email in RLS must match your dashboard login (same as orders).
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS public.consultation_booking_code_seq;

CREATE TABLE IF NOT EXISTS public.consultation_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  service text NOT NULL,
  preferred_date date,
  notes text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'declined')),
  /** Set automatically when status becomes `confirmed` (e.g. BSP-000042). */
  booking_code text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consultation_bookings_user_id_idx
  ON public.consultation_bookings (user_id);

CREATE INDEX IF NOT EXISTS consultation_bookings_created_at_idx
  ON public.consultation_bookings (created_at DESC);

-- Sync sequence with existing codes (safe if table empty)
DO $$
DECLARE
  mx bigint;
BEGIN
  SELECT COALESCE(MAX(substring(booking_code FROM 5)::bigint), 0)
  INTO mx
  FROM public.consultation_bookings
  WHERE booking_code ~ '^BSP-[0-9]+$';

  IF mx >= 1 THEN
    PERFORM setval('public.consultation_booking_code_seq', mx, true);
  ELSE
    PERFORM setval('public.consultation_booking_code_seq', 1, false);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.consultation_bookings_before_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();

  IF NEW.status = 'declined' THEN
    NEW.booking_code := NULL;
  ELSIF NEW.status = 'confirmed' THEN
    IF NEW.booking_code IS NULL OR btrim(NEW.booking_code) = '' THEN
      NEW.booking_code := 'BSP-' || lpad(nextval('public.consultation_booking_code_seq')::text, 6, '0');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS consultation_bookings_before_write ON public.consultation_bookings;
CREATE TRIGGER consultation_bookings_before_write
  BEFORE INSERT OR UPDATE ON public.consultation_bookings
  FOR EACH ROW
  EXECUTE PROCEDURE public.consultation_bookings_before_write();

ALTER TABLE public.consultation_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consultation_bookings_insert_own" ON public.consultation_bookings;
DROP POLICY IF EXISTS "consultation_bookings_select_own" ON public.consultation_bookings;
DROP POLICY IF EXISTS "consultation_bookings_select_admin" ON public.consultation_bookings;
DROP POLICY IF EXISTS "consultation_bookings_update_admin" ON public.consultation_bookings;

CREATE POLICY "consultation_bookings_insert_own" ON public.consultation_bookings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "consultation_bookings_select_own" ON public.consultation_bookings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "consultation_bookings_select_admin" ON public.consultation_bookings
  FOR SELECT
  USING ((auth.jwt() ->> 'email')::text = 'joeythebrandonline@gmail.com');

CREATE POLICY "consultation_bookings_update_admin" ON public.consultation_bookings
  FOR UPDATE
  USING ((auth.jwt() ->> 'email')::text = 'joeythebrandonline@gmail.com');
