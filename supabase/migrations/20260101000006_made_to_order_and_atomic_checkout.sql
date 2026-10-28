-- ============================================================
-- JOEY THE BRAND — 00006: Made to Order, Single Inventory Authority,
-- Atomic SKU Reservations, Payment Reconciliation & Durable Outbox
--
-- IMPORTANT: Reviewed migration file for local/staging verification.
-- Do NOT apply to production until explicitly authorized.
-- ============================================================

-- 1. Extend public.products with Fulfilment Mode, Publication, Lead Time,
--    Max MTO Quantity per Order, and /bespoke Showcase Flag.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS fulfillment_mode text NOT NULL DEFAULT 'stock_only',
  ADD COLUMN IF NOT EXISTS show_on_bespoke_page boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS made_to_order_lead_days integer NOT NULL DEFAULT 14,
  ADD COLUMN IF NOT EXISTS mto_max_qty_per_order integer NOT NULL DEFAULT 5;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_fulfillment_mode_chk,
  DROP CONSTRAINT IF EXISTS products_made_to_order_lead_days_chk,
  DROP CONSTRAINT IF EXISTS products_mto_max_qty_per_order_chk,
  DROP CONSTRAINT IF EXISTS products_bespoke_page_requires_mto_only_chk;

ALTER TABLE public.products
  ADD CONSTRAINT products_fulfillment_mode_chk
    CHECK (fulfillment_mode IN ('stock_only', 'stock_then_made_to_order', 'made_to_order_only')),
  ADD CONSTRAINT products_made_to_order_lead_days_chk
    CHECK (made_to_order_lead_days >= 1 AND made_to_order_lead_days <= 180),
  ADD CONSTRAINT products_mto_max_qty_per_order_chk
    CHECK (mto_max_qty_per_order >= 1 AND mto_max_qty_per_order <= 50),
  ADD CONSTRAINT products_bespoke_page_requires_mto_only_chk
    CHECK (NOT show_on_bespoke_page OR fulfillment_mode = 'made_to_order_only');

-- Backfill existing products safely:
-- Products that previously had bespoke_available = true become 'stock_then_made_to_order'
-- with show_on_bespoke_page = false so fallback products NEVER leak into /bespoke.
UPDATE public.products
SET
  fulfillment_mode = CASE
    WHEN COALESCE(bespoke_available, false) = true THEN 'stock_then_made_to_order'
    ELSE 'stock_only'
  END,
  made_to_order_lead_days = GREATEST(1, LEAST(180, COALESCE(bespoke_lead_days, 14))),
  show_on_bespoke_page = false
WHERE fulfillment_mode = 'stock_only' AND COALESCE(bespoke_available, false) = true;

-- Keep legacy columns (bespoke_available, bespoke_lead_days) synchronized for backwards compatibility
CREATE OR REPLACE FUNCTION public.products_sync_fulfillment_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.fulfillment_mode = 'made_to_order_only' THEN
    NEW.quantity := 0;
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
END;
$$;

DROP TRIGGER IF EXISTS products_sync_fulfillment_columns ON public.products;
CREATE TRIGGER products_sync_fulfillment_columns
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE PROCEDURE public.products_sync_fulfillment_columns();

-- 2. Extend public.orders for Server-Authoritative Checkout, Reservations & Conflict Holds
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE,
  ADD COLUMN IF NOT EXISTS subtotal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reservation_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS stock_conflict_flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_conflict_details jsonb,
  ADD COLUMN IF NOT EXISTS has_made_to_order_items boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_mixed_fulfillment boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_lead_days integer;

CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_ref_uniq_idx
  ON public.orders (payment_ref)
  WHERE payment_ref IS NOT NULL AND btrim(payment_ref) <> '';

-- Remove direct client-side INSERT policy on public.orders so all orders MUST go through
-- the server-authoritative /api/orders/create endpoint (service_role).
DROP POLICY IF EXISTS "orders_insert_guest_or_self" ON public.orders;
DROP POLICY IF EXISTS "orders_public_insert" ON public.orders;

-- 3. Atomic SKU-Level Inventory Reservations Table
CREATE TABLE IF NOT EXISTS public.inventory_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id text NOT NULL DEFAULT 'base',
  combo_id text NOT NULL DEFAULT 'base',
  sku_key text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'committed', 'released', 'expired', 'conflict_hold')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, sku_key)
);

CREATE INDEX IF NOT EXISTS inventory_reservations_active_sku_idx
  ON public.inventory_reservations (sku_key, expires_at)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS inventory_reservations_order_id_idx
  ON public.inventory_reservations (order_id);

ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_reservations_select_admin" ON public.inventory_reservations;
CREATE POLICY "inventory_reservations_select_admin" ON public.inventory_reservations
  FOR SELECT
  USING (public.is_admin_dashboard_user());

-- 4. Durable Order Notification Outbox Table (with Atomic Worker Claims & Scheduled Retries)
CREATE TABLE IF NOT EXISTS public.order_notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  recipient text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 6,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  locked_by text,
  provider_message_id text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, event_key)
);

CREATE INDEX IF NOT EXISTS order_notification_outbox_poll_idx
  ON public.order_notification_outbox (status, next_attempt_at)
  WHERE status IN ('pending', 'processing');

ALTER TABLE public.order_notification_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_notification_outbox_select_admin" ON public.order_notification_outbox;
CREATE POLICY "order_notification_outbox_select_admin" ON public.order_notification_outbox
  FOR SELECT
  USING (public.is_admin_dashboard_user());

-- 5. Helper Function: Read Authoritative Physical Stock for a Single SKU Key from a Product Row
CREATE OR REPLACE FUNCTION public.get_product_sku_physical_stock(
  p_product public.products,
  p_variant_id text,
  p_combo_id text
)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_elem jsonb;
  c_elem jsonb;
  v_id text := COALESCE(NULLIF(btrim(p_variant_id), ''), 'base');
  c_id text := COALESCE(NULLIF(btrim(p_combo_id), ''), 'base');
BEGIN
  -- Simple product or Solo ("Original") in Fits-Only mode
  IF v_id = 'base' AND c_id = 'base' THEN
    IF p_product.is_out_of_stock THEN
      RETURN 0;
    END IF;
    RETURN GREATEST(0, COALESCE(p_product.quantity, 0));
  END IF;

  -- Search variants JSONB
  IF p_product.variants IS NULL OR jsonb_typeof(p_product.variants) <> 'array' THEN
    RETURN 0;
  END IF;

  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_product.variants)
  LOOP
    IF COALESCE(v_elem ->> 'id', '') = v_id THEN
      -- If a specific combo is targeted
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
        -- Solo color variant
        IF COALESCE((v_elem ->> 'isOutOfStock')::boolean, false) THEN
          RETURN 0;
        END IF;
        RETURN GREATEST(0, COALESCE((v_elem ->> 'quantity')::integer, 0));
      END IF;
    END IF;
  END LOOP;

  RETURN 0;
END;
$$;

-- 6. Helper Function: Decrement Authoritative SKU Stock and Recompute Rollup Quantity
CREATE OR REPLACE FUNCTION public.decrement_product_sku_stock(
  p_product_id text,
  p_variant_id text,
  p_combo_id text,
  p_qty integer
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  p_row public.products%ROWTYPE;
  v_id text := COALESCE(NULLIF(btrim(p_variant_id), ''), 'base');
  c_id text := COALESCE(NULLIF(btrim(p_combo_id), ''), 'base');
  new_variants jsonb := '[]'::jsonb;
  v_elem jsonb;
  new_combos jsonb;
  c_elem jsonb;
  cur_qty integer;
  next_qty integer;
  has_color_variants boolean := false;
  rollup_qty integer := 0;
  all_leaves_out boolean := true;
BEGIN
  SELECT * INTO p_row FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product % not found during stock decrement', p_product_id;
  END IF;

  -- Case A: Base product stock (Simple product OR "Original" solo option on Fits-Only product)
  IF v_id = 'base' AND c_id = 'base' THEN
    next_qty := GREATEST(0, COALESCE(p_row.quantity, 0) - p_qty);
    UPDATE public.products
    SET
      quantity = next_qty,
      is_out_of_stock = (next_qty <= 0 AND fulfillment_mode <> 'made_to_order_only')
    WHERE id = p_product_id;
    RETURN;
  END IF;

  -- Case B: Variant or Combo stock inside variants JSONB
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
          cur_qty := GREATEST(0, COALESCE((v_elem ->> 'quantity')::integer, 0));
          next_qty := GREATEST(0, cur_qty - p_qty);
          v_elem := jsonb_set(v_elem, '{quantity}', to_jsonb(next_qty), true);
          v_elem := jsonb_set(v_elem, '{isOutOfStock}', to_jsonb(next_qty <= 0), true);
        END IF;
      END IF;

      new_variants := new_variants || jsonb_build_array(v_elem);
    END LOOP;

    -- If the product uses color/matrix variants, recompute top-level rollup quantity from variants
    -- so product.quantity and variant quantities never drift out of sync.
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
      -- Fits-Only mode: base product.quantity is separate from fit-combo quantities
      UPDATE public.products
      SET variants = new_variants
      WHERE id = p_product_id;
    END IF;
  END IF;
END;
$$;

-- 7. Atomic RPC: Create Order + SKU Reservations with Deterministic Row Locking
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
  -- 1. Idempotency check by idempotency_key
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

  -- 2. Lock all referenced products in deterministic ascending ID order to prevent deadlocks
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
      -- Expire any stale active reservations for this product first
      UPDATE public.inventory_reservations
      SET status = 'expired', updated_at = now()
      WHERE product_id = p_row.id
        AND status = 'active'
        AND expires_at <= now();
    END LOOP;

    -- 3. Verify available stock for every ready_to_wear SKU
    FOR res_item IN
      SELECT *
      FROM jsonb_array_elements(p_reservations) r
      ORDER BY (r ->> 'skuKey') ASC
    LOOP
      v_product_id := res_item ->> 'productId';
      v_variant_id := COALESCE(NULLIF(res_item ->> 'variantId', ''), 'base');
      v_combo_id := COALESCE(NULLIF(res_item ->> 'comboId', ''), 'base');
      v_sku_key := res_item ->> 'skuKey';
      v_req_qty := COALESCE((res_item ->> 'quantity')::integer, 0);

      SELECT * INTO p_row FROM public.products WHERE id = v_product_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Product % not found', v_product_id USING ERRCODE = 'check_violation';
      END IF;

      v_phys_qty := public.get_product_sku_physical_stock(p_row, v_variant_id, v_combo_id);

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

  -- 4. Inspect items for MTO / mixed fulfilment summary metadata
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

  -- 5. Insert Order
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

  -- 6. Insert Active Reservations for Ready-to-Wear SKUs
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

-- 8. Atomic RPC: Reconcile Verified Payment, Settle Reservations / Detect Late Conflicts & Enqueue Outbox
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
BEGIN
  -- 1. Lock the order row first
  SELECT * INTO ord FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'status', 404, 'error', 'Order not found.');
  END IF;

  -- 2. Idempotency check: if already paid, return immediately without re-decrementing or re-enqueueing
  IF ord.payment_status = 'paid' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'alreadyPaid', true,
      'orderStatus', ord.status,
      'stockConflictFlagged', ord.stock_conflict_flagged,
      'order', to_jsonb(ord)
    );
  END IF;

  -- 3. Verify reference uniqueness & amount match
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

  -- 4. Lock all products referenced by this order's reservations in deterministic ascending order
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
    -- Expire any other orders' overdue reservations on this product first
    UPDATE public.inventory_reservations
    SET status = 'expired', updated_at = v_now
    WHERE product_id = p_row.id
      AND order_id <> ord.id
      AND status = 'active'
      AND expires_at <= v_now;
  END LOOP;

  -- 5. Settle each reservation in deterministic sku_key order
  FOR res_row IN
    SELECT *
    FROM public.inventory_reservations
    WHERE order_id = ord.id
    ORDER BY sku_key ASC
    FOR UPDATE
  LOOP
    SELECT * INTO p_row FROM public.products WHERE id = res_row.product_id;
    v_phys_qty := public.get_product_sku_physical_stock(p_row, res_row.variant_id, res_row.combo_id);

    IF res_row.status = 'active' AND res_row.expires_at > v_now AND v_phys_qty >= res_row.quantity THEN
      -- Active reservation within window: commit & decrement physical stock
      PERFORM public.decrement_product_sku_stock(res_row.product_id, res_row.variant_id, res_row.combo_id, res_row.quantity);
      UPDATE public.inventory_reservations
      SET status = 'committed', updated_at = v_now
      WHERE id = res_row.id;
    ELSE
      -- Reservation was expired (late payment completion) or released:
      -- Check if unreserved physical stock is still available
      SELECT COALESCE(SUM(quantity), 0)::integer INTO v_other_reserved
      FROM public.inventory_reservations
      WHERE sku_key = res_row.sku_key
        AND order_id <> ord.id
        AND status = 'active'
        AND expires_at > v_now;

      v_avail_qty := GREATEST(0, v_phys_qty - v_other_reserved);

      IF v_avail_qty >= res_row.quantity THEN
        PERFORM public.decrement_product_sku_stock(res_row.product_id, res_row.variant_id, res_row.combo_id, res_row.quantity);
        UPDATE public.inventory_reservations
        SET status = 'committed', updated_at = v_now
        WHERE id = res_row.id;
      ELSE
        -- Late payment after expiry & another buyer took the physical stock:
        -- DO NOT decrement below 0 and DO NOT proceed to normal 'processing'.
        -- Place order into 'paid_requires_resolution' operational hold!
        v_has_conflict := true;
        v_conflicts := v_conflicts || jsonb_build_array(
          jsonb_build_object(
            'skuKey', res_row.sku_key,
            'productId', res_row.product_id,
            'variantId', res_row.variant_id,
            'comboId', res_row.combo_id,
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

  -- 6. Stamp estimatedProductionReadyDate (paid_at + leadDays in Africa/Accra) on Made to Order items
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

  -- 7. Update Order to Paid + Target Status
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

  -- 8. Enqueue Durable Notification Outbox Events in the SAME transaction
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

-- 9. Atomic RPC: Claim Outbox Batch for Worker / Scheduled Retry (FOR UPDATE SKIP LOCKED)
CREATE OR REPLACE FUNCTION public.claim_order_notification_outbox_batch(
  p_worker_id text,
  p_limit integer DEFAULT 20,
  p_order_id uuid DEFAULT NULL
)
RETURNS SETOF public.order_notification_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
BEGIN
  RETURN QUERY
  WITH claimable AS (
    SELECT o.id
    FROM public.order_notification_outbox o
    WHERE (p_order_id IS NULL OR o.order_id = p_order_id)
      AND o.attempt_count < o.max_attempts
      AND (
        (o.status = 'pending' AND o.next_attempt_at <= v_now)
        OR (o.status = 'processing' AND (o.locked_until IS NULL OR o.locked_until <= v_now))
      )
    ORDER BY o.next_attempt_at ASC, o.created_at ASC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 20), 100))
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.order_notification_outbox target
  SET
    status = 'processing',
    attempt_count = target.attempt_count + 1,
    locked_by = p_worker_id,
    locked_until = v_now + interval '2 minutes',
    updated_at = v_now
  FROM claimable c
  WHERE target.id = c.id
  RETURNING target.*;
END;
$$;
