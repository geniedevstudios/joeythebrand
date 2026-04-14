-- ============================================================
-- JOEY THE BRAND — Consultation Duration & Payment Tracking
-- ============================================================

-- 1) Add new columns to track the selected plan and payment status
ALTER TABLE public.consultation_bookings
  ADD COLUMN IF NOT EXISTS duration_hours integer,
  ADD COLUMN IF NOT EXISTS price_ghs numeric,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'refunded', 'failed', 'abandoned'));

-- Expand allowed payment_status values (for existing databases where the column/check already exists)
ALTER TABLE public.consultation_bookings
  DROP CONSTRAINT IF EXISTS consultation_bookings_payment_status_check;

ALTER TABLE public.consultation_bookings
  ADD CONSTRAINT consultation_bookings_payment_status_check
  CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'refunded', 'failed', 'abandoned'));

-- 2) Add a payment reference column for auditing (Paystack reference)
ALTER TABLE public.consultation_bookings
  ADD COLUMN IF NOT EXISTS payment_ref text;
