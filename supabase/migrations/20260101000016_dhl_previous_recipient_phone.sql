ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_phone_previous text;
