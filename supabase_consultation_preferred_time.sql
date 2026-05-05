-- ============================================================
-- JOEY THE BRAND — Consultation preferred time (optional)
-- Adds a preferred_time text column to consultation_bookings.
-- Run in Supabase SQL Editor.
-- ============================================================

ALTER TABLE public.consultation_bookings
  ADD COLUMN IF NOT EXISTS preferred_time text;

