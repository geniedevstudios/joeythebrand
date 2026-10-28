-- Retain physical inventory when switching a product to made-to-order only.
CREATE OR REPLACE FUNCTION public.products_sync_fulfillment_columns()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.fulfillment_mode = 'made_to_order_only' THEN
    NEW.is_out_of_stock := false;
    NEW.bespoke_available := true;
  ELSIF NEW.fulfillment_mode = 'stock_then_made_to_order' THEN
    NEW.bespoke_available := true;
    NEW.show_on_bespoke_page := false;
  ELSE
    NEW.bespoke_available := false;
    NEW.show_on_bespoke_page := false;
  END IF;
  NEW.bespoke_lead_days := COALESCE(NEW.made_to_order_lead_days, NEW.bespoke_lead_days, 14);
  NEW.made_to_order_lead_days := COALESCE(NEW.made_to_order_lead_days, NEW.bespoke_lead_days, 14);
  RETURN NEW;
END $$;
