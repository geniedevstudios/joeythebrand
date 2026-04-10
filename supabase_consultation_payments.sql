-- ============================================================
-- JOEY THE BRAND — Consultation Duration & Payment Tracking
-- ============================================================

-- 1) Add new columns to track the selected plan and payment status
ALTER TABLE public.consultation_bookings
  ADD COLUMN IF NOT EXISTS duration_hours integer,
  ADD COLUMN IF NOT EXISTS price_ghs numeric,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid', 'refunded'));

-- 2) Add a payment reference column for auditing (Paystack reference)
ALTER TABLE public.consultation_bookings
  ADD COLUMN IF NOT EXISTS payment_ref text;
