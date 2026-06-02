-- Add DHL integration columns to public.orders

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dhl_tracking_number text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dhl_label_url text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dhl_status text;

-- Optional: If DHL tracking numbers are unique per order, we could add a constraint,
-- but usually it's safer to leave them as normal text columns for now.
-- CREATE UNIQUE INDEX IF NOT EXISTS orders_dhl_tracking_number_idx ON public.orders(dhl_tracking_number) WHERE dhl_tracking_number IS NOT NULL;
