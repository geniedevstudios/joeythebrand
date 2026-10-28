-- ============================================================
-- JOEY THE BRAND — 00004: Bespoke Consultations, Calendar, Rescheduling & Audit Trail
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS public.consultation_booking_code_seq;

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
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "consultation_settings_update_admin" ON public.consultation_settings
  FOR UPDATE USING (public.is_admin_dashboard_user());
CREATE POLICY "consultation_settings_insert_admin" ON public.consultation_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_dashboard_user());

CREATE TABLE IF NOT EXISTS public.consultation_day_rules (
  day date PRIMARY KEY,
  max_slots_per_day int NOT NULL
    CHECK (max_slots_per_day >= 1 AND max_slots_per_day <= 50),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consultation_day_rules ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consultation_day_rules_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS consultation_day_rules_touch_updated_at ON public.consultation_day_rules;
CREATE TRIGGER consultation_day_rules_touch_updated_at
  BEFORE UPDATE ON public.consultation_day_rules
  FOR EACH ROW
  EXECUTE PROCEDURE public.consultation_day_rules_touch_updated_at();

DROP POLICY IF EXISTS "consultation_day_rules_select_auth" ON public.consultation_day_rules;
DROP POLICY IF EXISTS "consultation_day_rules_insert_admin" ON public.consultation_day_rules;
DROP POLICY IF EXISTS "consultation_day_rules_update_admin" ON public.consultation_day_rules;
DROP POLICY IF EXISTS "consultation_day_rules_delete_admin" ON public.consultation_day_rules;

CREATE POLICY "consultation_day_rules_select_auth" ON public.consultation_day_rules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "consultation_day_rules_insert_admin" ON public.consultation_day_rules
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_dashboard_user());
CREATE POLICY "consultation_day_rules_update_admin" ON public.consultation_day_rules
  FOR UPDATE USING (public.is_admin_dashboard_user());
CREATE POLICY "consultation_day_rules_delete_admin" ON public.consultation_day_rules
  FOR DELETE USING (public.is_admin_dashboard_user());

CREATE OR REPLACE FUNCTION public.consultation_effective_max_slots(p_day date)
RETURNS int
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT r.max_slots_per_day FROM public.consultation_day_rules r WHERE r.day = p_day),
    (SELECT s.max_slots_per_day FROM public.consultation_settings s WHERE s.id = 1),
    5
  );
$$;

CREATE TABLE IF NOT EXISTS public.consultation_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'shop' CHECK (source IN ('shop', 'portfolio')),
  portfolio_access_token uuid UNIQUE,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  service text NOT NULL,
  preferred_date date,
  preferred_time text,
  notes text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reschedule_proposed', 'confirmed', 'declined', 'cancelled')),
  booking_code text UNIQUE,
  scheduled_at timestamptz,
  proposed_scheduled_at timestamptz,
  proposed_date date,
  proposed_time text,
  reschedule_note text,
  reschedule_proposed_at timestamptz,
  customer_reschedule_response text,
  customer_responded_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  refund_review_required boolean NOT NULL DEFAULT false,
  refund_review_status text
    CHECK (refund_review_status IS NULL OR refund_review_status IN ('pending_review', 'reviewed', 'resolved')),
  duration_hours integer,
  price_ghs numeric,
  payment_status text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'refunded', 'failed', 'abandoned')),
  payment_ref text,
  state_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consultation_bookings_user_id_idx ON public.consultation_bookings (user_id);
CREATE INDEX IF NOT EXISTS consultation_bookings_created_at_idx ON public.consultation_bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS consultation_bookings_scheduled_at_idx ON public.consultation_bookings (scheduled_at)
  WHERE status = 'confirmed' AND scheduled_at IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS consultation_bookings_payment_ref_uniq_idx ON public.consultation_bookings (payment_ref)
  WHERE payment_ref IS NOT NULL AND btrim(payment_ref) <> '';

ALTER TABLE public.consultation_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consultation_bookings_insert_own" ON public.consultation_bookings;
DROP POLICY IF EXISTS "consultation_bookings_select_own" ON public.consultation_bookings;
DROP POLICY IF EXISTS "consultation_bookings_select_admin" ON public.consultation_bookings;
DROP POLICY IF EXISTS "consultation_bookings_update_admin" ON public.consultation_bookings;

CREATE POLICY "consultation_bookings_insert_own" ON public.consultation_bookings
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id AND COALESCE(source, 'shop') = 'shop');
CREATE POLICY "consultation_bookings_select_own" ON public.consultation_bookings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "consultation_bookings_select_admin" ON public.consultation_bookings
  FOR SELECT USING (public.is_admin_dashboard_user());
CREATE POLICY "consultation_bookings_update_admin" ON public.consultation_bookings
  FOR UPDATE USING (public.is_admin_dashboard_user());

-- Audit & Notification Tables
CREATE TABLE IF NOT EXISTS public.consultation_state_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.consultation_bookings (id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  actor text NOT NULL,
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consultation_state_transitions_booking_id_idx
  ON public.consultation_state_transitions (booking_id, created_at DESC);

ALTER TABLE public.consultation_state_transitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "consultation_state_transitions_select_admin" ON public.consultation_state_transitions;
CREATE POLICY "consultation_state_transitions_select_admin" ON public.consultation_state_transitions
  FOR SELECT USING (public.is_admin_dashboard_user());

CREATE TABLE IF NOT EXISTS public.consultation_notification_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.consultation_bookings (id) ON DELETE CASCADE,
  event_key text NOT NULL,
  recipient text NOT NULL,
  status text NOT NULL DEFAULT 'sending' CHECK (status IN ('sending', 'sent', 'failed')),
  attempt_count int NOT NULL DEFAULT 1,
  provider_message_id text,
  last_error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, event_key)
);

CREATE INDEX IF NOT EXISTS consultation_notification_attempts_booking_id_idx
  ON public.consultation_notification_attempts (booking_id, created_at DESC);

ALTER TABLE public.consultation_notification_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "consultation_notification_attempts_select_admin" ON public.consultation_notification_attempts;
CREATE POLICY "consultation_notification_attempts_select_admin" ON public.consultation_notification_attempts
  FOR SELECT USING (public.is_admin_dashboard_user());

CREATE TABLE IF NOT EXISTS public.consultation_action_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.consultation_bookings (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  jti text NOT NULL UNIQUE,
  proposal_scheduled_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_action text CHECK (used_action IS NULL OR used_action IN ('accept', 'request_another_time')),
  response_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consultation_action_tokens_booking_id_idx
  ON public.consultation_action_tokens (booking_id, created_at DESC);

ALTER TABLE public.consultation_action_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "consultation_action_tokens_select_admin" ON public.consultation_action_tokens;
CREATE POLICY "consultation_action_tokens_select_admin" ON public.consultation_action_tokens
  FOR SELECT USING (public.is_admin_dashboard_user());

-- Triggers & RPCs (Africa/Accra)
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

  SELECT public.consultation_effective_max_slots(NEW.preferred_date) INTO max_s;
  IF max_s IS NULL THEN max_s := 5; END IF;

  SELECT COUNT(*) INTO cnt
  FROM public.consultation_bookings
  WHERE status = 'confirmed'
    AND scheduled_at IS NOT NULL
    AND (scheduled_at AT TIME ZONE 'Africa/Accra')::date = NEW.preferred_date;

  IF cnt >= max_s THEN
    RAISE EXCEPTION 'That day is fully booked. Pick another date.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.user_id IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.consultation_bookings
      WHERE user_id IS NULL
        AND lower(btrim(customer_email)) = lower(btrim(NEW.customer_email))
        AND (
          status IN ('confirmed', 'reschedule_proposed')
          OR (status = 'pending' AND payment_status IN ('paid', 'pending'))
        )
        AND (
          preferred_date = NEW.preferred_date
          OR (
            status = 'confirmed'
            AND scheduled_at IS NOT NULL
            AND (scheduled_at AT TIME ZONE 'Africa/Accra')::date = NEW.preferred_date
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
        AND (
          status IN ('confirmed', 'reschedule_proposed')
          OR (status = 'pending' AND payment_status = 'paid')
        )
        AND (
          preferred_date = NEW.preferred_date
          OR (
            status = 'confirmed'
            AND scheduled_at IS NOT NULL
            AND (scheduled_at AT TIME ZONE 'Africa/Accra')::date = NEW.preferred_date
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

DROP TRIGGER IF EXISTS consultation_bookings_validate_insert ON public.consultation_bookings;
CREATE TRIGGER consultation_bookings_validate_insert
  BEFORE INSERT ON public.consultation_bookings
  FOR EACH ROW
  EXECUTE PROCEDURE public.consultation_bookings_validate_insert();

CREATE OR REPLACE FUNCTION public.consultation_bookings_before_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  max_s int;
  cnt int;
  slot_conflict int;
  target_day date;
BEGIN
  NEW.updated_at := now();

  IF NEW.status IN ('declined', 'cancelled') THEN
    NEW.booking_code := NULL;
    NEW.scheduled_at := NULL;
    NEW.proposed_scheduled_at := NULL;
    IF NEW.status = 'cancelled' AND NEW.cancelled_at IS NULL THEN
      NEW.cancelled_at := now();
    END IF;
    IF NEW.payment_status = 'paid' THEN
      NEW.refund_review_required := true;
      IF NEW.refund_review_status IS NULL THEN
        NEW.refund_review_status := 'pending_review';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = 'reschedule_proposed' THEN
    IF NEW.payment_status IS DISTINCT FROM 'paid' THEN
      RAISE EXCEPTION 'Cannot propose a reschedule unless payment is marked paid.'
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.proposed_scheduled_at IS NULL THEN
      RAISE EXCEPTION 'Set a proposed date and time for rescheduling.'
        USING ERRCODE = 'check_violation';
    END IF;

    target_day := (NEW.proposed_scheduled_at AT TIME ZONE 'Africa/Accra')::date;
    SELECT public.consultation_effective_max_slots(target_day) INTO max_s;
    IF max_s IS NULL THEN max_s := 5; END IF;

    SELECT COUNT(*) INTO cnt
    FROM public.consultation_bookings
    WHERE status = 'confirmed'
      AND scheduled_at IS NOT NULL
      AND (scheduled_at AT TIME ZONE 'Africa/Accra')::date = target_day
      AND id IS DISTINCT FROM NEW.id;

    IF cnt >= max_s THEN
      RAISE EXCEPTION 'That proposed day already has the maximum number of confirmed consultations.'
        USING ERRCODE = 'check_violation';
    END IF;

    SELECT COUNT(*) INTO slot_conflict
    FROM public.consultation_bookings
    WHERE status = 'confirmed'
      AND scheduled_at = NEW.proposed_scheduled_at
      AND id IS DISTINCT FROM NEW.id;

    IF slot_conflict > 0 THEN
      RAISE EXCEPTION 'That proposed time slot is already booked by another confirmed appointment.'
        USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.status = 'confirmed' THEN
    IF NEW.payment_status IS DISTINCT FROM 'paid' THEN
      RAISE EXCEPTION 'Cannot confirm a consultation booking unless payment is marked paid.'
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.scheduled_at IS NULL THEN
      RAISE EXCEPTION 'Set an appointment date and time before confirming.'
        USING ERRCODE = 'check_violation';
    END IF;

    target_day := (NEW.scheduled_at AT TIME ZONE 'Africa/Accra')::date;
    SELECT public.consultation_effective_max_slots(target_day) INTO max_s;
    IF max_s IS NULL THEN max_s := 5; END IF;

    SELECT COUNT(*) INTO cnt
    FROM public.consultation_bookings
    WHERE status = 'confirmed'
      AND scheduled_at IS NOT NULL
      AND (scheduled_at AT TIME ZONE 'Africa/Accra')::date = target_day
      AND id IS DISTINCT FROM NEW.id;

    IF cnt >= max_s THEN
      RAISE EXCEPTION 'That day already has the maximum number of confirmed consultations.'
        USING ERRCODE = 'check_violation';
    END IF;

    SELECT COUNT(*) INTO slot_conflict
    FROM public.consultation_bookings
    WHERE status = 'confirmed'
      AND scheduled_at = NEW.scheduled_at
      AND id IS DISTINCT FROM NEW.id;

    IF slot_conflict > 0 THEN
      RAISE EXCEPTION 'That exact time slot is already booked by another confirmed appointment.'
        USING ERRCODE = 'check_violation';
    END IF;

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

CREATE OR REPLACE FUNCTION public.consultation_availability_for_booking(p_user_id uuid, p_days_ahead int)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_s int;
  from_d date := (timezone('Africa/Accra', now()))::date;
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
            AND (
              status IN ('confirmed', 'reschedule_proposed')
              OR (status = 'pending' AND payment_status = 'paid')
            )
            AND preferred_date IS NOT NULL
          UNION
          SELECT (scheduled_at AT TIME ZONE 'Africa/Accra')::date AS dt FROM public.consultation_bookings
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
        SELECT (scheduled_at AT TIME ZONE 'Africa/Accra')::date AS bucket_date
        FROM public.consultation_bookings
        WHERE status = 'confirmed'
          AND scheduled_at IS NOT NULL
          AND (scheduled_at AT TIME ZONE 'Africa/Accra')::date BETWEEN from_d AND to_d
        GROUP BY 1
        HAVING COUNT(*) >= public.consultation_effective_max_slots((scheduled_at AT TIME ZONE 'Africa/Accra')::date)
      ) c
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.consultation_availability_public(p_days_ahead int)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_s int;
  from_d date := (timezone('Africa/Accra', now()))::date;
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
        SELECT (scheduled_at AT TIME ZONE 'Africa/Accra')::date AS bucket_date
        FROM public.consultation_bookings
        WHERE status = 'confirmed'
          AND scheduled_at IS NOT NULL
          AND (scheduled_at AT TIME ZONE 'Africa/Accra')::date BETWEEN from_d AND to_d
        GROUP BY 1
        HAVING COUNT(*) >= public.consultation_effective_max_slots((scheduled_at AT TIME ZONE 'Africa/Accra')::date)
      ) c
    ), '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.consultation_availability_for_booking(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consultation_availability_public(int) TO anon;
GRANT EXECUTE ON FUNCTION public.consultation_availability_public(int) TO authenticated;

-- Portfolio Realtime Bumps
CREATE TABLE IF NOT EXISTS public.portfolio_realtime_bumps (
  id int PRIMARY KEY DEFAULT 1,
  last_updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.portfolio_realtime_bumps (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.portfolio_realtime_bumps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bumps_public_read" ON public.portfolio_realtime_bumps;
CREATE POLICY "bumps_public_read" ON public.portfolio_realtime_bumps FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.bump_portfolio_realtime()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.portfolio_realtime_bumps SET last_updated_at = now() WHERE id = 1;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS bump_portfolio_trigger ON public.consultation_bookings;
CREATE TRIGGER bump_portfolio_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.consultation_bookings
  FOR EACH STATEMENT
  EXECUTE PROCEDURE public.bump_portfolio_realtime();
