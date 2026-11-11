-- Per-size inventory: sizeStock on colour variants is authoritative for RTW SKUs.
-- SKU key format becomes productId::variantId::comboId::size when a size is reserved.

ALTER TABLE public.inventory_reservations
  ADD COLUMN IF NOT EXISTS size text NOT NULL DEFAULT '';

-- Replace physical-stock reader (old 3-arg signature → 4-arg with size)
DROP FUNCTION IF EXISTS public.get_product_sku_physical_stock(public.products, text, text);

CREATE OR REPLACE FUNCTION public.get_product_sku_physical_stock(
  p_product public.products,
  p_variant_id text,
  p_combo_id text,
  p_size text DEFAULT ''
)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_elem jsonb;
  c_elem jsonb;
  s_elem jsonb;
  v_id text := COALESCE(NULLIF(btrim(p_variant_id), ''), 'base');
  c_id text := COALESCE(NULLIF(btrim(p_combo_id), ''), 'base');
  s_key text := lower(btrim(COALESCE(p_size, '')));
  size_qty integer;
  has_size_stock boolean := false;
BEGIN
  IF v_id = 'base' AND c_id = 'base' THEN
    IF p_product.is_out_of_stock THEN
      RETURN 0;
    END IF;
    -- Optional product.sizes[].quantity when size is provided
    IF s_key <> '' AND p_product.sizes IS NOT NULL AND jsonb_typeof(p_product.sizes) = 'array' THEN
      FOR s_elem IN SELECT * FROM jsonb_array_elements(p_product.sizes)
      LOOP
        IF lower(btrim(COALESCE(s_elem ->> 'name', s_elem ->> 'size', ''))) = s_key
           AND (s_elem ? 'quantity') THEN
          RETURN GREATEST(0, COALESCE((s_elem ->> 'quantity')::integer, 0));
        END IF;
      END LOOP;
    END IF;
    RETURN GREATEST(0, COALESCE(p_product.quantity, 0));
  END IF;

  IF p_product.variants IS NULL OR jsonb_typeof(p_product.variants) <> 'array' THEN
    RETURN 0;
  END IF;

  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_product.variants)
  LOOP
    IF COALESCE(v_elem ->> 'id', '') = v_id THEN
      IF c_id <> 'base' THEN
        IF v_elem -> 'combos' IS NOT NULL AND jsonb_typeof(v_elem -> 'combos') = 'array' THEN
          FOR c_elem IN SELECT * FROM jsonb_array_elements(v_elem -> 'combos')
          LOOP
            IF COALESCE(c_elem ->> 'id', '') = c_id THEN
              IF COALESCE((c_elem ->> 'isOutOfStock')::boolean, false) THEN
                RETURN 0;
              END IF;
              RETURN GREATEST(0, COALESCE((c_elem ->> 'quantity')::integer, 0));
            END IF;
          END LOOP;
        END IF;
        RETURN 0;
      ELSE
        IF COALESCE((v_elem ->> 'isOutOfStock')::boolean, false) THEN
          RETURN 0;
        END IF;

        -- Prefer sizeStock when a size is requested
        IF s_key <> '' AND v_elem -> 'sizeStock' IS NOT NULL AND jsonb_typeof(v_elem -> 'sizeStock') = 'array'
           AND jsonb_array_length(v_elem -> 'sizeStock') > 0 THEN
          has_size_stock := true;
          FOR s_elem IN SELECT * FROM jsonb_array_elements(v_elem -> 'sizeStock')
          LOOP
            IF lower(btrim(COALESCE(s_elem ->> 'size', ''))) = s_key THEN
              RETURN GREATEST(0, COALESCE((s_elem ->> 'quantity')::integer, 0));
            END IF;
          END LOOP;
          -- Size tracked but this size missing / zero
          IF has_size_stock THEN
            RETURN 0;
          END IF;
        END IF;

        RETURN GREATEST(0, COALESCE((v_elem ->> 'quantity')::integer, 0));
      END IF;
    END IF;
  END LOOP;

  RETURN 0;
END;
$$;

-- Replace decrement to update sizeStock and roll up colour + product quantities
DROP FUNCTION IF EXISTS public.decrement_product_sku_stock(text, text, text, integer);

CREATE OR REPLACE FUNCTION public.decrement_product_sku_stock(
  p_product_id text,
  p_variant_id text,
  p_combo_id text,
  p_qty integer,
  p_size text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  p_row public.products%ROWTYPE;
  v_id text := COALESCE(NULLIF(btrim(p_variant_id), ''), 'base');
  c_id text := COALESCE(NULLIF(btrim(p_combo_id), ''), 'base');
  s_key text := lower(btrim(COALESCE(p_size, '')));
  new_variants jsonb := '[]'::jsonb;
  v_elem jsonb;
  new_combos jsonb;
  c_elem jsonb;
  new_size_stock jsonb;
  s_elem jsonb;
  cur_qty integer;
  next_qty integer;
  has_color_variants boolean := false;
  rollup_qty integer := 0;
  all_leaves_out boolean := true;
  size_sum integer;
  matched_size boolean;
BEGIN
  SELECT * INTO p_row FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product % not found during stock decrement', p_product_id;
  END IF;

  IF v_id = 'base' AND c_id = 'base' THEN
    next_qty := GREATEST(0, COALESCE(p_row.quantity, 0) - p_qty);
    UPDATE public.products
    SET
      quantity = next_qty,
      is_out_of_stock = (next_qty <= 0 AND fulfillment_mode <> 'made_to_order_only')
    WHERE id = p_product_id;
    RETURN;
  END IF;

  IF p_row.variants IS NOT NULL AND jsonb_typeof(p_row.variants) = 'array' THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_row.variants)
    LOOP
      IF COALESCE(v_elem ->> 'type', 'color') = 'color' THEN
        has_color_variants := true;
      END IF;

      IF COALESCE(v_elem ->> 'id', '') = v_id THEN
        IF c_id <> 'base' AND v_elem -> 'combos' IS NOT NULL AND jsonb_typeof(v_elem -> 'combos') = 'array' THEN
          new_combos := '[]'::jsonb;
          FOR c_elem IN SELECT * FROM jsonb_array_elements(v_elem -> 'combos')
          LOOP
            IF COALESCE(c_elem ->> 'id', '') = c_id THEN
              cur_qty := GREATEST(0, COALESCE((c_elem ->> 'quantity')::integer, 0));
              next_qty := GREATEST(0, cur_qty - p_qty);
              c_elem := jsonb_set(c_elem, '{quantity}', to_jsonb(next_qty), true);
              c_elem := jsonb_set(c_elem, '{isOutOfStock}', to_jsonb(next_qty <= 0), true);
            END IF;
            new_combos := new_combos || jsonb_build_array(c_elem);
          END LOOP;
          v_elem := jsonb_set(v_elem, '{combos}', new_combos, true);
        ELSIF c_id = 'base' THEN
          -- Decrement sizeStock row when present, then roll into colour quantity
          IF s_key <> '' AND v_elem -> 'sizeStock' IS NOT NULL AND jsonb_typeof(v_elem -> 'sizeStock') = 'array'
             AND jsonb_array_length(v_elem -> 'sizeStock') > 0 THEN
            new_size_stock := '[]'::jsonb;
            size_sum := 0;
            matched_size := false;
            FOR s_elem IN SELECT * FROM jsonb_array_elements(v_elem -> 'sizeStock')
            LOOP
              IF lower(btrim(COALESCE(s_elem ->> 'size', ''))) = s_key THEN
                matched_size := true;
                cur_qty := GREATEST(0, COALESCE((s_elem ->> 'quantity')::integer, 0));
                next_qty := GREATEST(0, cur_qty - p_qty);
                s_elem := jsonb_set(s_elem, '{quantity}', to_jsonb(next_qty), true);
              ELSE
                next_qty := GREATEST(0, COALESCE((s_elem ->> 'quantity')::integer, 0));
              END IF;
              size_sum := size_sum + next_qty;
              new_size_stock := new_size_stock || jsonb_build_array(s_elem);
            END LOOP;
            IF matched_size THEN
              v_elem := jsonb_set(v_elem, '{sizeStock}', new_size_stock, true);
              v_elem := jsonb_set(v_elem, '{quantity}', to_jsonb(size_sum), true);
              v_elem := jsonb_set(v_elem, '{isOutOfStock}', to_jsonb(size_sum <= 0), true);
            ELSE
              cur_qty := GREATEST(0, COALESCE((v_elem ->> 'quantity')::integer, 0));
              next_qty := GREATEST(0, cur_qty - p_qty);
              v_elem := jsonb_set(v_elem, '{quantity}', to_jsonb(next_qty), true);
              v_elem := jsonb_set(v_elem, '{isOutOfStock}', to_jsonb(next_qty <= 0), true);
            END IF;
          ELSE
            cur_qty := GREATEST(0, COALESCE((v_elem ->> 'quantity')::integer, 0));
            next_qty := GREATEST(0, cur_qty - p_qty);
            v_elem := jsonb_set(v_elem, '{quantity}', to_jsonb(next_qty), true);
            v_elem := jsonb_set(v_elem, '{isOutOfStock}', to_jsonb(next_qty <= 0), true);
          END IF;
        END IF;
      END IF;

      new_variants := new_variants || jsonb_build_array(v_elem);
    END LOOP;

    IF has_color_variants THEN
      FOR v_elem IN SELECT * FROM jsonb_array_elements(new_variants)
      LOOP
        IF COALESCE(v_elem ->> 'type', 'color') = 'color' THEN
          IF NOT COALESCE((v_elem ->> 'isOutOfStock')::boolean, false) THEN
            cur_qty := GREATEST(0, COALESCE((v_elem ->> 'quantity')::integer, 0));
            rollup_qty := rollup_qty + cur_qty;
            IF cur_qty > 0 THEN all_leaves_out := false; END IF;
          END IF;
          IF v_elem -> 'combos' IS NOT NULL AND jsonb_typeof(v_elem -> 'combos') = 'array' THEN
            FOR c_elem IN SELECT * FROM jsonb_array_elements(v_elem -> 'combos')
            LOOP
              IF NOT COALESCE((c_elem ->> 'isOutOfStock')::boolean, false) THEN
                cur_qty := GREATEST(0, COALESCE((c_elem ->> 'quantity')::integer, 0));
                rollup_qty := rollup_qty + cur_qty;
                IF cur_qty > 0 THEN all_leaves_out := false; END IF;
              END IF;
            END LOOP;
          END IF;
        END IF;
      END LOOP;

      UPDATE public.products
      SET
        variants = new_variants,
        quantity = rollup_qty,
        is_out_of_stock = (all_leaves_out AND fulfillment_mode <> 'made_to_order_only')
      WHERE id = p_product_id;
    ELSE
      UPDATE public.products
      SET variants = new_variants
      WHERE id = p_product_id;
    END IF;
  END IF;
END;
$$;

-- Patch create_order_with_reservations to pass size into stock checks / inserts
CREATE OR REPLACE FUNCTION public.create_order_with_reservations(
  p_idempotency_key text,
  p_user_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_address text,
  p_items jsonb,
  p_subtotal numeric,
  p_discount numeric,
  p_shipping_cost numeric,
  p_total numeric,
  p_promotion_code text,
  p_notes text,
  p_payment_ref text,
  p_reservations jsonb,
  p_reservation_ttl_seconds integer DEFAULT 900
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_order public.orders%ROWTYPE;
  new_order public.orders%ROWTYPE;
  p_row public.products%ROWTYPE;
  res_item jsonb;
  v_product_id text;
  v_variant_id text;
  v_combo_id text;
  v_size text;
  v_sku_key text;
  v_req_qty integer;
  v_phys_qty integer;
  v_reserved_qty integer;
  v_avail_qty integer;
  v_expires_at timestamptz := now() + make_interval(secs => GREATEST(60, COALESCE(p_reservation_ttl_seconds, 900)));
  v_has_mto boolean := false;
  v_has_rtw boolean := false;
  v_max_lead integer := 0;
  item_elem jsonb;
BEGIN
  IF p_idempotency_key IS NOT NULL AND btrim(p_idempotency_key) <> '' THEN
    SELECT * INTO existing_order
    FROM public.orders
    WHERE idempotency_key = btrim(p_idempotency_key)
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'order', to_jsonb(existing_order)
      );
    END IF;
  END IF;

  IF p_reservations IS NOT NULL AND jsonb_typeof(p_reservations) = 'array' AND jsonb_array_length(p_reservations) > 0 THEN
    FOR p_row IN
      SELECT p.*
      FROM public.products p
      WHERE p.id IN (
        SELECT DISTINCT (r ->> 'productId')
        FROM jsonb_array_elements(p_reservations) r
      )
      ORDER BY p.id ASC
      FOR UPDATE
    LOOP
      UPDATE public.inventory_reservations
      SET status = 'expired', updated_at = now()
      WHERE product_id = p_row.id
        AND status = 'active'
        AND expires_at <= now();
    END LOOP;

    FOR res_item IN
      SELECT *
      FROM jsonb_array_elements(p_reservations) r
      ORDER BY (r ->> 'skuKey') ASC
    LOOP
      v_product_id := res_item ->> 'productId';
      v_variant_id := COALESCE(NULLIF(res_item ->> 'variantId', ''), 'base');
      v_combo_id := COALESCE(NULLIF(res_item ->> 'comboId', ''), 'base');
      v_size := COALESCE(NULLIF(btrim(res_item ->> 'size'), ''), '');
      v_sku_key := res_item ->> 'skuKey';
      v_req_qty := COALESCE((res_item ->> 'quantity')::integer, 0);

      SELECT * INTO p_row FROM public.products WHERE id = v_product_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Product % not found', v_product_id USING ERRCODE = 'check_violation';
      END IF;

      v_phys_qty := public.get_product_sku_physical_stock(p_row, v_variant_id, v_combo_id, v_size);

      SELECT COALESCE(SUM(quantity), 0)::integer INTO v_reserved_qty
      FROM public.inventory_reservations
      WHERE sku_key = v_sku_key
        AND status = 'active'
        AND expires_at > now();

      v_avail_qty := GREATEST(0, v_phys_qty - v_reserved_qty);

      IF v_avail_qty < v_req_qty THEN
        RAISE EXCEPTION 'INSUFFICIENT_STOCK:%:%:%', v_sku_key, v_avail_qty, v_req_qty
          USING ERRCODE = 'check_violation';
      END IF;
    END LOOP;
  END IF;

  FOR item_elem IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF COALESCE(item_elem ->> 'fulfillmentType', '') = 'made_to_order'
       OR COALESCE((item_elem ->> 'isMadeToOrder')::boolean, false)
       OR COALESCE((item_elem ->> 'isBespoke')::boolean, false)
    THEN
      v_has_mto := true;
      v_max_lead := GREATEST(v_max_lead, COALESCE((item_elem ->> 'leadDays')::integer, (item_elem ->> 'bespokeLeadDays')::integer, 14));
    ELSE
      v_has_rtw := true;
    END IF;
  END LOOP;

  INSERT INTO public.orders (
    idempotency_key,
    user_id,
    customer_name,
    customer_email,
    customer_phone,
    shipping_address,
    items,
    subtotal,
    discount,
    shipping_cost,
    total,
    promotion_code,
    payment_status,
    payment_ref,
    status,
    notes,
    reservation_expires_at,
    has_made_to_order_items,
    is_mixed_fulfillment,
    max_lead_days
  )
  VALUES (
    NULLIF(btrim(COALESCE(p_idempotency_key, '')), ''),
    p_user_id,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_shipping_address,
    p_items,
    p_subtotal,
    p_discount,
    p_shipping_cost,
    p_total,
    p_promotion_code,
    'unpaid',
    p_payment_ref,
    'pending',
    p_notes,
    CASE WHEN v_has_rtw THEN v_expires_at ELSE NULL END,
    v_has_mto,
    (v_has_mto AND v_has_rtw),
    CASE WHEN v_has_mto THEN v_max_lead ELSE NULL END
  )
  RETURNING * INTO new_order;

  IF p_reservations IS NOT NULL AND jsonb_typeof(p_reservations) = 'array' THEN
    FOR res_item IN
      SELECT *
      FROM jsonb_array_elements(p_reservations) r
      ORDER BY (r ->> 'skuKey') ASC
    LOOP
      INSERT INTO public.inventory_reservations (
        order_id,
        product_id,
        variant_id,
        combo_id,
        size,
        sku_key,
        quantity,
        status,
        expires_at
      )
      VALUES (
        new_order.id,
        res_item ->> 'productId',
        COALESCE(NULLIF(res_item ->> 'variantId', ''), 'base'),
        COALESCE(NULLIF(res_item ->> 'comboId', ''), 'base'),
        COALESCE(NULLIF(btrim(res_item ->> 'size'), ''), ''),
        res_item ->> 'skuKey',
        (res_item ->> 'quantity')::integer,
        'active',
        v_expires_at
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'order', to_jsonb(new_order)
  );
END;
$$;

-- Patch reconcile_order_payment settlement to decrement by size
CREATE OR REPLACE FUNCTION public.reconcile_order_payment(
  p_order_id uuid,
  p_payment_ref text,
  p_verified_amount_pesewas bigint,
  p_admin_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ord public.orders%ROWTYPE;
  p_row public.products%ROWTYPE;
  res_row public.inventory_reservations%ROWTYPE;
  expected_pesewas bigint;
  v_phys_qty integer;
  v_other_reserved integer;
  v_avail_qty integer;
  v_has_conflict boolean := false;
  v_conflicts jsonb := '[]'::jsonb;
  v_now timestamptz := now();
  v_next_status text := 'processing';
  v_updated_items jsonb := '[]'::jsonb;
  item_elem jsonb;
  v_lead integer;
  v_ready_date text;
  v_size text;
BEGIN
  SELECT * INTO ord FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'status', 404, 'error', 'Order not found.');
  END IF;

  IF ord.payment_status = 'paid' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'alreadyPaid', true,
      'orderStatus', ord.status,
      'stockConflictFlagged', ord.stock_conflict_flagged,
      'order', to_jsonb(ord)
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.orders
    WHERE payment_ref = p_payment_ref AND id <> ord.id
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'status', 409,
      'error', 'Payment reference is already bound to another order.'
    );
  END IF;

  expected_pesewas := ROUND(ord.total * 100)::bigint;
  IF p_verified_amount_pesewas <> expected_pesewas THEN
    RETURN jsonb_build_object(
      'ok', false,
      'status', 400,
      'error', format('Payment amount mismatch: expected %s pesewas, got %s.', expected_pesewas, p_verified_amount_pesewas)
    );
  END IF;

  FOR p_row IN
    SELECT p.*
    FROM public.products p
    WHERE p.id IN (
      SELECT DISTINCT r.product_id
      FROM public.inventory_reservations r
      WHERE r.order_id = ord.id
    )
    ORDER BY p.id ASC
    FOR UPDATE
  LOOP
    UPDATE public.inventory_reservations
    SET status = 'expired', updated_at = v_now
    WHERE product_id = p_row.id
      AND order_id <> ord.id
      AND status = 'active'
      AND expires_at <= v_now;
  END LOOP;

  FOR res_row IN
    SELECT *
    FROM public.inventory_reservations
    WHERE order_id = ord.id
    ORDER BY sku_key ASC
    FOR UPDATE
  LOOP
    SELECT * INTO p_row FROM public.products WHERE id = res_row.product_id;
    v_size := COALESCE(res_row.size, '');
    v_phys_qty := public.get_product_sku_physical_stock(p_row, res_row.variant_id, res_row.combo_id, v_size);

    IF res_row.status = 'active' AND res_row.expires_at > v_now AND v_phys_qty >= res_row.quantity THEN
      PERFORM public.decrement_product_sku_stock(res_row.product_id, res_row.variant_id, res_row.combo_id, res_row.quantity, v_size);
      UPDATE public.inventory_reservations
      SET status = 'committed', updated_at = v_now
      WHERE id = res_row.id;
    ELSE
      SELECT COALESCE(SUM(quantity), 0)::integer INTO v_other_reserved
      FROM public.inventory_reservations
      WHERE sku_key = res_row.sku_key
        AND order_id <> ord.id
        AND status = 'active'
        AND expires_at > v_now;

      v_avail_qty := GREATEST(0, v_phys_qty - v_other_reserved);

      IF v_avail_qty >= res_row.quantity THEN
        PERFORM public.decrement_product_sku_stock(res_row.product_id, res_row.variant_id, res_row.combo_id, res_row.quantity, v_size);
        UPDATE public.inventory_reservations
        SET status = 'committed', updated_at = v_now
        WHERE id = res_row.id;
      ELSE
        v_has_conflict := true;
        v_conflicts := v_conflicts || jsonb_build_array(
          jsonb_build_object(
            'skuKey', res_row.sku_key,
            'productId', res_row.product_id,
            'variantId', res_row.variant_id,
            'comboId', res_row.combo_id,
            'size', v_size,
            'requestedQty', res_row.quantity,
            'availablePhysicalQty', v_avail_qty,
            'detectedAt', v_now
          )
        );
        UPDATE public.inventory_reservations
        SET status = 'conflict_hold', updated_at = v_now
        WHERE id = res_row.id;
      END IF;
    END IF;
  END LOOP;

  FOR item_elem IN SELECT * FROM jsonb_array_elements(ord.items)
  LOOP
    IF COALESCE(item_elem ->> 'fulfillmentType', '') = 'made_to_order'
       OR COALESCE((item_elem ->> 'isMadeToOrder')::boolean, false)
       OR COALESCE((item_elem ->> 'isBespoke')::boolean, false)
    THEN
      v_lead := GREATEST(1, COALESCE((item_elem ->> 'leadDays')::integer, (item_elem ->> 'bespokeLeadDays')::integer, 14));
      v_ready_date := ((v_now AT TIME ZONE 'Africa/Accra')::date + v_lead)::text;
      item_elem := jsonb_set(item_elem, '{estimatedReadyDate}', to_jsonb(v_ready_date), true);
      IF COALESCE(item_elem ->> 'productionStatus', '') = '' THEN
        item_elem := jsonb_set(item_elem, '{productionStatus}', '"queued"'::jsonb, true);
      END IF;
    END IF;
    v_updated_items := v_updated_items || jsonb_build_array(item_elem);
  END LOOP;

  IF v_has_conflict THEN
    v_next_status := 'paid_requires_resolution';
  ELSE
    v_next_status := 'processing';
  END IF;

  UPDATE public.orders
  SET
    payment_status = 'paid',
    payment_ref = p_payment_ref,
    paid_at = v_now,
    status = v_next_status,
    items = v_updated_items,
    stock_conflict_flagged = v_has_conflict,
    stock_conflict_details = CASE WHEN v_has_conflict THEN v_conflicts ELSE NULL END,
    updated_at = v_now
  WHERE id = ord.id
  RETURNING * INTO ord;

  IF ord.customer_email IS NOT NULL AND btrim(ord.customer_email) <> '' THEN
    INSERT INTO public.order_notification_outbox (
      order_id,
      event_key,
      recipient,
      payload,
      status,
      next_attempt_at
    )
    VALUES (
      ord.id,
      'order_paid:customer',
      btrim(ord.customer_email),
      jsonb_build_object(
        'type', 'order_paid_customer',
        'orderId', ord.id,
        'orderNumber', ord.order_number,
        'stockConflictFlagged', v_has_conflict
      ),
      'pending',
      v_now
    )
    ON CONFLICT (order_id, event_key) DO NOTHING;
  END IF;

  IF p_admin_email IS NOT NULL AND btrim(p_admin_email) <> '' THEN
    INSERT INTO public.order_notification_outbox (
      order_id,
      event_key,
      recipient,
      payload,
      status,
      next_attempt_at
    )
    VALUES (
      ord.id,
      CASE WHEN v_has_conflict THEN 'order_paid_conflict:admin' ELSE 'order_paid:admin' END,
      btrim(p_admin_email),
      jsonb_build_object(
        'type', CASE WHEN v_has_conflict THEN 'order_paid_conflict_admin' ELSE 'order_paid_admin' END,
        'orderId', ord.id,
        'orderNumber', ord.order_number,
        'stockConflictFlagged', v_has_conflict,
        'conflicts', v_conflicts
      ),
      'pending',
      v_now
    )
    ON CONFLICT (order_id, event_key) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'alreadyPaid', false,
    'orderStatus', ord.status,
    'stockConflictFlagged', v_has_conflict,
    'conflicts', v_conflicts,
    'order', to_jsonb(ord)
  );
END;
$$;

-- Re-lock execute grants for replaced signatures
DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN (
      'create_order_with_reservations', 'reconcile_order_payment',
      'get_product_sku_physical_stock', 'decrement_product_sku_stock'
    )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.signature);
  END LOOP;
END $$;
