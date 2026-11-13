alter table public.products
  add column if not exists customs_profile jsonb;

alter table public.orders
  add column if not exists dhl_parcel jsonb,
  add column if not exists dhl_declared_value numeric,
  add column if not exists dhl_shipment_claimed_at timestamptz,
  add column if not exists dhl_pickup_claimed_at timestamptz,
  add column if not exists dhl_pickup_confirmation text;
