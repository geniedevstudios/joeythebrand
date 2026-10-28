-- Restrict privileged order RPCs and hide drafts from public catalogue reads.
-- Apply only after the corresponding application release has been tested in staging.
DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN (
      'create_order_with_reservations', 'reconcile_order_payment',
      'claim_order_notification_outbox_batch', 'get_product_sku_physical_stock',
      'decrement_product_sku_stock', 'products_sync_fulfillment_columns'
    )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.signature);
  END LOOP;
END $$;

DROP POLICY IF EXISTS products_public_read ON public.products;
DROP POLICY IF EXISTS products_admin_read ON public.products;
CREATE POLICY products_public_read ON public.products
  FOR SELECT TO anon, authenticated
  USING (is_published OR (fulfillment_mode = 'made_to_order_only' AND show_on_bespoke_page));
CREATE POLICY products_admin_read ON public.products
  FOR SELECT TO authenticated
  USING (public.is_admin_dashboard_user());
