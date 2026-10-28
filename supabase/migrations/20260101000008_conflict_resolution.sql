-- Conflict holds are cleared only by an authenticated operator through this RPC.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stock_resolution_history jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.guard_order_conflict_hold()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF OLD.stock_conflict_flagged AND current_user <> (SELECT pg_get_userbyid(relowner) FROM pg_class WHERE oid = 'public.orders'::regclass)
     AND (NEW.status IS DISTINCT FROM OLD.status OR NEW.stock_conflict_flagged IS DISTINCT FROM OLD.stock_conflict_flagged
          OR NEW.items IS DISTINCT FROM OLD.items OR NEW.stock_conflict_details IS DISTINCT FROM OLD.stock_conflict_details
          OR NEW.stock_resolution_history IS DISTINCT FROM OLD.stock_resolution_history
          OR NEW.dhl_tracking_number IS DISTINCT FROM OLD.dhl_tracking_number) THEN
    RAISE EXCEPTION 'Unresolved stock conflict must be resolved through the protected operation';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS orders_guard_conflict_hold ON public.orders;
CREATE TRIGGER orders_guard_conflict_hold BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.guard_order_conflict_hold();

CREATE OR REPLACE FUNCTION public.resolve_order_stock_conflict(p_order_id uuid, p_reason text, p_agreement text, p_lead_days integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE ord public.orders%ROWTYPE; entry jsonb; v_items jsonb := '[]'::jsonb; conflict_count integer; matched_count integer := 0; ready_date text; v_has_mto boolean := false; v_has_rtw boolean := false; v_max_lead integer := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_dashboard_user() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF length(btrim(coalesce(p_reason,''))) < 3 OR length(btrim(coalesce(p_agreement,''))) < 3 OR p_lead_days IS NULL OR p_lead_days NOT BETWEEN 1 AND 180 THEN
    RAISE EXCEPTION 'A reason, customer agreement and calendar-day production time are required';
  END IF;
  SELECT * INTO ord FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND OR NOT ord.stock_conflict_flagged OR ord.status <> 'paid_requires_resolution' OR ord.payment_status <> 'paid' THEN RAISE EXCEPTION 'Order is not an unresolved paid conflict'; END IF;
  SELECT count(*) INTO conflict_count FROM public.inventory_reservations WHERE order_id=ord.id AND status='conflict_hold';
  IF conflict_count = 0 THEN RAISE EXCEPTION 'No conflicting reservations found'; END IF;
  ready_date := ((now() AT TIME ZONE 'Africa/Accra')::date + p_lead_days)::text;
  FOR entry IN SELECT value FROM jsonb_array_elements(ord.items) LOOP
    IF EXISTS (SELECT 1 FROM public.inventory_reservations WHERE order_id=ord.id AND status='conflict_hold' AND sku_key=entry->>'skuKey') THEN
      matched_count := matched_count + 1;
      entry := entry || jsonb_build_object('fulfillmentType','made_to_order','isMadeToOrder',true,'isBespoke',true,'leadDays',p_lead_days,'bespokeLeadDays',p_lead_days,'estimatedReadyDate',ready_date,'productionStatus','queued');
    END IF;
    IF COALESCE(entry->>'fulfillmentType', '') = 'made_to_order'
       OR COALESCE((entry->>'isMadeToOrder')::boolean, false)
       OR COALESCE((entry->>'isBespoke')::boolean, false) THEN
      v_has_mto := true;
      v_max_lead := GREATEST(v_max_lead, COALESCE((entry->>'leadDays')::integer, (entry->>'bespokeLeadDays')::integer, 14));
    ELSE
      v_has_rtw := true;
    END IF;
    v_items := v_items || jsonb_build_array(entry);
  END LOOP;
  IF matched_count = 0 OR EXISTS (SELECT 1 FROM public.inventory_reservations r WHERE r.order_id=ord.id AND r.status='conflict_hold' AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(ord.items) i WHERE i->>'skuKey'=r.sku_key)) THEN RAISE EXCEPTION 'Conflicting items do not match reservations'; END IF;
  UPDATE public.inventory_reservations SET status='released',updated_at=now() WHERE order_id=ord.id AND status='conflict_hold';
  UPDATE public.orders SET items=v_items, status='processing',stock_conflict_flagged=false,
    has_made_to_order_items=v_has_mto, is_mixed_fulfillment=(v_has_mto AND v_has_rtw),
    max_lead_days=CASE WHEN v_has_mto THEN v_max_lead ELSE NULL END,
    stock_resolution_history=stock_resolution_history || jsonb_build_array(jsonb_build_object('action','convert_to_mto','actor_id',auth.uid(),'actor_email',auth.jwt()->>'email','resolved_at',now(),'reason',p_reason,'customer_agreement',p_agreement,'calendar_days',p_lead_days,'affected_conflicts',ord.stock_conflict_details)),updated_at=now()
    WHERE id=ord.id;
END $$;
REVOKE ALL ON FUNCTION public.resolve_order_stock_conflict(uuid,text,text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_order_stock_conflict(uuid,text,text,integer) TO authenticated;
REVOKE ALL ON FUNCTION public.guard_order_conflict_hold() FROM PUBLIC, anon, authenticated;
