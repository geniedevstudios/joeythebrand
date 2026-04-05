-- ============================================================
-- JOEY THE BRAND — Portfolio (public) consultations + shop source
-- Run in Supabase SQL Editor AFTER supabase_consultation_calendar.sql
--
-- Required before using joey-darko /booking (API uses source=portfolio,
-- nullable user_id, and consultation_availability_public).
-- ============================================================

-- 1) Source: shop (joey-app, signed-in) vs portfolio (joey-darko, no account)
ALTER TABLE public.consultation_bookings
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'shop'
    CHECK (source IN ('shop', 'portfolio'));

ALTER TABLE public.consultation_bookings
  ADD COLUMN IF NOT EXISTS portfolio_access_token uuid UNIQUE;

-- 2) Portfolio rows have no auth user; shop rows keep user_id
ALTER TABLE public.consultation_bookings
  ALTER COLUMN user_id DROP NOT NULL;

DROP POLICY IF EXISTS "consultation_bookings_insert_own" ON public.consultation_bookings;
CREATE POLICY "consultation_bookings_insert_own" ON public.consultation_bookings
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
    AND COALESCE(source, 'shop') = 'shop'
  );

-- 3) INSERT validation: capacity + per-identity duplicate (user OR email for portfolio)
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

  IF NEW.user_id IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.consultation_bookings
      WHERE user_id IS NULL
        AND lower(btrim(customer_email)) = lower(btrim(NEW.customer_email))
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
  ELSE
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
  END IF;

  RETURN NEW;
END;
$$;

-- 4) Public calendar (no auth): capacity only — for portfolio date picker
CREATE OR REPLACE FUNCTION public.consultation_availability_public(p_days_ahead int)
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
  SELECT COALESCE(max_slots_per_day, 5) INTO max_s FROM public.consultation_settings WHERE id = 1;
  IF max_s IS NULL THEN max_s := 5; END IF;

  RETURN jsonb_build_object(
    'maxSlotsPerDay', max_s,
    'userBlockedDates', '[]'::jsonb,
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

GRANT EXECUTE ON FUNCTION public.consultation_availability_public(int) TO anon;
GRANT EXECUTE ON FUNCTION public.consultation_availability_public(int) TO authenticated;
