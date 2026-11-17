ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS dhl_customs_lines jsonb,
  ADD COLUMN IF NOT EXISTS dhl_shipment_description text;
