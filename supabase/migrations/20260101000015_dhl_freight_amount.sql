ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS dhl_freight_amount numeric;
