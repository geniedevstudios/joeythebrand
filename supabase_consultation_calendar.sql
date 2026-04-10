-- ============================================================
-- JOEY THE BRAND — Consultation calendar: slots/day, scheduled time, validation
-- Run in Supabase SQL Editor AFTER supabase_consultation_bookings.sql
-- Replace admin email if needed (same as orders RLS).
-- ============================================================

-- 1) Settings: max confirmed appointments per calendar day (UTC date bucket)
CREATE TABLE IF NOT EXISTS public.consultation_settings (
  id int PRIMARY KEY CHECK (id = 1),
  max_slots_per_day int NOT NULL DEFAULT 5
    CHECK (max_slots_per_day >= 1 AND max_slots_per_day <= 50)
);

INSERT INTO public.consultation_settings (id, max_slots_per_day)
VALUES (1, 5)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.consultation_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consultation_settings_select_auth" ON public.consultation_settings;
DROP POLICY IF EXISTS "consultation_settings_update_admin" ON public.consultation_settings;
DROP POLICY IF EXISTS "consultation_settings_insert_admin" ON public.consultation_settings;

CREATE POLICY "consultation_settings_select_auth" ON public.consultation_settings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "consultation_settings_update_admin" ON public.consultation_settings
  FOR UPDATE
  USING ((auth.jwt() ->> 'email')::text = 'joeythebrandonline@gmail.com');

CREATE POLICY "consultation_settings_insert_admin" ON public.consultation_settings
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email')::text = 'joeythebrandonline@gmail.com');

-- 2) Actual appointment time (set when admin confirms)
ALTER TABLE public.consultation_bookings
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

-- Partial index on scheduled_at (expression indexes like (x AT TIME ZONE 'UTC')::date
-- can hit parser errors in some SQL runners; btree on timestamptz is enough here.)
CREATE INDEX IF NOT EXISTS consultation_bookings_scheduled_at_idx
  ON public.consultation_bookings (scheduled_at)
  WHERE status = 'confirmed' AND scheduled_at IS NOT NULL;

-- 3) INSERT validation: capacity + user cannot double-book same calendar day
CREATE OR REPLACE FUNCTION public.consultation_bookings_validate_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  max_s int;
  cnt int;
BEGIN
  IF NEW.preferred_date IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(max_slots_per_day, 5) INTO max_s FROM public.consultation_settings WHERE id = 1;
  IF max_s IS NULL THEN max_s := 5; END IF;

  SELECT COUNT(*) INTO cnt
  FROM public.consultation_bookings
  WHERE status = 'confirmed'
    AND scheduled_at IS NOT NULL
    AND (scheduled_at AT TIME ZONE 'UTC')::date = NEW.preferred_date;

  IF cnt >= max_s THEN
    RAISE EXCEPTION 'That day is fully booked. Pick another date.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.consultation_bookings
    WHERE user_id = NEW.user_id
      AND status IN ('pending', 'confirmed')
      AND (
        preferred_date = NEW.preferred_date
        OR (
          status = 'confirmed'
          AND scheduled_at IS NOT NULL
          AND (scheduled_at AT TIME ZONE 'UTC')::date = NEW.preferred_date
        )
      )
  ) THEN
    RAISE EXCEPTION 'You already have a request or appointment on that day.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS consultation_bookings_validate_insert ON public.consultation_bookings;
CREATE TRIGGER consultation_bookings_validate_insert
  BEFORE INSERT ON public.consultation_bookings
  FOR EACH ROW
  EXECUTE PROCEDURE public.consultation_bookings_validate_insert();

-- 4) BEFORE WRITE: booking code, decline cleanup, confirm requires scheduled_at + capacity
CREATE OR REPLACE FUNCTION public.consultation_bookings_before_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  max_s int;
  cnt int;
BEGIN
  NEW.updated_at := now();

  IF NEW.status = 'declined' THEN
    NEW.booking_code := NULL;
    NEW.scheduled_at := NULL;
    RETURN NEW;
  END IF;

  IF NEW.status = 'confirmed' THEN
    IF NEW.scheduled_at IS NULL THEN
      RAISE EXCEPTION 'Set an appointment date and time before confirming.'
        USING ERRCODE = 'check_violation';
    END IF;

    SELECT COALESCE(max_slots_per_day, 5) INTO max_s FROM public.consultation_settings WHERE id = 1;
    IF max_s IS NULL THEN max_s := 5; END IF;

    SELECT COUNT(*) INTO cnt
    FROM public.consultation_bookings
    WHERE status = 'confirmed'
      AND scheduled_at IS NOT NULL
      AND (scheduled_at AT TIME ZONE 'UTC')::date = (NEW.scheduled_at AT TIME ZONE 'UTC')::date
      AND id IS DISTINCT FROM NEW.id;

    IF cnt >= max_s THEN
      RAISE EXCEPTION 'That day already has the maximum number of confirmed consultations.'
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.booking_code IS NULL OR btrim(NEW.booking_code) = '' THEN
      NEW.booking_code := 'BSP-' || lpad(nextval('public.consultation_booking_code_seq')::text, 6, '0');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- (trigger already exists from initial migration; replace function only)

-- 5) RPC: disabled dates for date picker (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.consultation_availability_for_booking(p_user_id uuid, p_days_ahead int)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_s int;
  from_d date := (timezone('utc', now()))::date;
  to_d date := from_d + GREATEST(1, LEAST(p_days_ahead, 365));
BEGIN
  IF p_user_id IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT COALESCE(max_slots_per_day, 5) INTO max_s FROM public.consultation_settings WHERE id = 1;
  IF max_s IS NULL THEN max_s := 5; END IF;

  RETURN jsonb_build_object(
    'maxSlotsPerDay', max_s,
    'userBlockedDates', COALESCE((
      SELECT jsonb_agg(to_jsonb(d::text) ORDER BY d)
      FROM (
        SELECT DISTINCT dt::date AS d
        FROM (
          SELECT preferred_date AS dt FROM public.consultation_bookings
          WHERE user_id = p_user_id
            AND status IN ('pending', 'confirmed')
            AND preferred_date IS NOT NULL
          UNION
          SELECT (scheduled_at AT TIME ZONE 'UTC')::date AS dt FROM public.consultation_bookings
          WHERE user_id = p_user_id
            AND status = 'confirmed'
            AND scheduled_at IS NOT NULL
        ) u
        WHERE dt BETWEEN from_d AND to_d
      ) x
    ), '[]'::jsonb),
    'atCapacityDates', COALESCE((
      SELECT jsonb_agg(to_jsonb(bucket_date::text) ORDER BY bucket_date)
      FROM (
        SELECT (scheduled_at AT TIME ZONE 'UTC')::date AS bucket_date
        FROM public.consultation_bookings
        WHERE status = 'confirmed'
          AND scheduled_at IS NOT NULL
          AND (scheduled_at AT TIME ZONE 'UTC')::date BETWEEN from_d AND to_d
        GROUP BY 1
        HAVING COUNT(*) >= max_s
      ) c
    ), '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.consultation_availability_for_booking(uuid, int) TO authenticated;
