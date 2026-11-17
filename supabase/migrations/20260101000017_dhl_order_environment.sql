ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS dhl_environment text
  CHECK (dhl_environment IN ('test', 'live'));

-- Example: classify an order only after verifying the waybill with DHL.
-- UPDATE public.orders SET dhl_environment = 'test'
-- WHERE id = '<verified-order-uuid>'::uuid AND dhl_environment IS NULL;
