import crypto from "crypto";
import * as React from "react";
import OrderConfirmationEmail from "../emails/OrderConfirmationEmail";
import {
  buildSkuKey,
  getVariantStockStatus,
  resolveProductFulfillmentMode,
} from "./variantUtils";
import type {
  ItemFulfillmentType,
  OrderItem,
  ProductCombo,
  ProductVariant,
} from "./types";

export const DEFAULT_ORDERS_SENDER = "orders@joeythebrand.com";
export const DEFAULT_ADMIN_ORDERS_URL = "https://admin.joeythebrand.com/orders";
export const PRIMARY_ADMIN_EMAIL = "joeythebrandonline@gmail.com";

export interface OrderEmailMessage {
  from: string;
  to: string | string[];
  subject: string;
  react: React.ReactElement;
  headers?: Record<string, string>;
}

export interface OrderEmailSender {
  send(
    msg: OrderEmailMessage,
    options?: { idempotencyKey?: string },
  ): Promise<{ data?: { id?: string } | null; error?: { message?: string } | null }>;
}

export interface PaystackOrderVerifyResult {
  ok: boolean;
  status?: boolean;
  message?: string;
  data?: {
    status?: string;
    reference?: string;
    amount?: number;
    currency?: string;
    metadata?: {
      orderId?: string;
      order_id?: string;
      custom_fields?: Array<{
        variable_name?: string;
        value?: string;
      }>;
    };
  };
}

export type PaystackOrderVerifier = (
  reference: string,
  secretKey: string,
) => Promise<PaystackOrderVerifyResult>;

export const defaultPaystackOrderVerifier: PaystackOrderVerifier = async (
  reference: string,
  secretKey: string,
): Promise<PaystackOrderVerifyResult> => {
  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${secretKey}` },
    },
  );
  const data = (await res.json()) as PaystackOrderVerifyResult;
  return {
    ok: res.ok,
    status: data?.status,
    message: data?.message,
    data: data?.data,
  };
};

export type ShippingRateCalculator = (params: {
  destination: { city: string; postalCode?: string; countryCode: string };
  weightKg: number;
}) => Promise<{ price: number }>;

export interface CreateOrderLineRequest {
  productId: string;
  variantId?: string;
  comboId?: string;
  size: string;
  fit?: string;
  quantity: number;
  /**
   * Decision 1 — Partial Stock:
   * When a stock_then_made_to_order SKU has 0 < availableStock < quantity,
   * the customer may explicitly set fulfillmentChoice: "made_to_order" to order
   * the full requested quantity as Made to Order, or adjust quantity to availableStock.
   */
  fulfillmentChoice?: ItemFulfillmentType;
}

export interface CreateOrderInput {
  idempotencyKey?: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingDestination: "ghana" | "international";
  shippingOption?: "dhl" | "sales" | null;
  shippingAddress: string;
  destinationDetails?: {
    city: string;
    postalCode?: string;
    countryCode: string;
  };
  promotionCode?: string;
  notes?: string;
  items: CreateOrderLineRequest[];
  reservationTtlSeconds?: number;
}

export interface PartialStockConflictDetail {
  productId: string;
  skuKey: string;
  itemName: string;
  requestedQty: number;
  availableStock: number;
  mtoMaxQtyPerOrder: number;
  leadDays: number;
}

export function getOrdersFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_ORDERS_SENDER;
}

export function getOrdersAdminEmail(): string {
  return (
    process.env.ORDERS_ADMIN_EMAIL?.trim() ||
    process.env.CONTACT_TO_EMAIL?.trim() ||
    PRIMARY_ADMIN_EMAIL
  );
}

export function getAdminOrdersUrl(): string {
  return process.env.ADMIN_ORDERS_URL?.trim() || DEFAULT_ADMIN_ORDERS_URL;
}

// ── 1) Server-Authoritative Order Creation + Atomic SKU Reservations ─────────

export async function createServerAuthoritativeOrder(params: {
  supabaseAdmin: any;
  input: CreateOrderInput;
  calculateShippingRate?: ShippingRateCalculator;
}): Promise<
  | {
      ok: true;
      status: 200;
      idempotent: boolean;
      order: Record<string, any>;
      paystackReference: string;
      amountPesewas: number;
    }
  | {
      ok: false;
      status: number;
      code:
        | "INVALID_INPUT"
        | "PRODUCT_NOT_FOUND"
        | "OPTION_UNAVAILABLE"
        | "INSUFFICIENT_STOCK"
        | "PARTIAL_STOCK_CHOICE_REQUIRED"
        | "MTO_LIMIT_EXCEEDED"
        | "PROMO_INVALID"
        | "SHIPPING_ERROR"
        | "SERVER_ERROR";
      error: string;
      partialStockConflicts?: PartialStockConflictDetail[];
      details?: unknown;
    }
> {
  const { supabaseAdmin, input } = params;

  if (!input.userId?.trim()) {
    return {
      ok: false,
      status: 401,
      code: "INVALID_INPUT",
      error: "Authentication required to create an order.",
    };
  }

  if (
    !input.customerName?.trim() ||
    !input.customerEmail?.trim() ||
    !input.customerPhone?.trim() ||
    !input.shippingAddress?.trim()
  ) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_INPUT",
      error: "Customer contact and shipping address details are required.",
    };
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_INPUT",
      error: "Order must contain at least one item.",
    };
  }

  // 1. Check idempotency key first before doing heavy work
  const cleanIdempotencyKey = input.idempotencyKey?.trim() || "";
  if (cleanIdempotencyKey) {
    const { data: existingOrder } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("idempotency_key", cleanIdempotencyKey)
      .maybeSingle();

    if (existingOrder) {
      return {
        ok: true,
        status: 200,
        idempotent: true,
        order: existingOrder,
        paystackReference: existingOrder.payment_ref,
        amountPesewas: Math.round(Number(existingOrder.total) * 100),
      };
    }
  }

  // 2. Fetch authoritative products sorted by ID
  const uniqueProductIds = [
    ...new Set(input.items.map((i) => String(i.productId || "").trim()).filter(Boolean)),
  ].sort();

  const { data: productRows, error: prodErr } = await supabaseAdmin
    .from("products")
    .select("*")
    .in("id", uniqueProductIds);

  if (prodErr || !productRows) {
    return {
      ok: false,
      status: 500,
      code: "SERVER_ERROR",
      error: "Failed to load product catalog for validation.",
    };
  }

  const productMap = new Map<string, any>();
  for (const row of productRows) {
    productMap.set(row.id, row);
  }

  // 3. Fetch active non-expired reservations for these products
  const nowIso = new Date().toISOString();
  const { data: activeReservations } = await supabaseAdmin
    .from("inventory_reservations")
    .select("sku_key, quantity, status, expires_at")
    .in("product_id", uniqueProductIds)
    .eq("status", "active");

  const reservedBySku = new Map<string, number>();
  for (const r of activeReservations || []) {
    if (r.expires_at && new Date(r.expires_at).getTime() > Date.now()) {
      reservedBySku.set(
        r.sku_key,
        (reservedBySku.get(r.sku_key) || 0) + Number(r.quantity || 0),
      );
    }
  }

  // Aggregate requested quantities per SKU in case the cart has multiple sizes of the same SKU
  const requestedRtwBySku = new Map<string, number>();
  const resolvedOrderItems: OrderItem[] = [];
  const reservationsToCreateMap = new Map<
    string,
    { productId: string; variantId: string; comboId: string; skuKey: string; quantity: number }
  >();
  const partialStockConflicts: PartialStockConflictDetail[] = [];

  let subtotal = 0;
  let totalWeightKg = 0;

  for (const reqItem of input.items) {
    const qty = Math.floor(Number(reqItem.quantity || 0));
    if (!Number.isFinite(qty) || qty <= 0) {
      return {
        ok: false,
        status: 400,
        code: "INVALID_INPUT",
        error: "Item quantity must be a positive integer.",
      };
    }

    const pRow = productMap.get(reqItem.productId);
    const isOrderableOnBespoke =
      pRow?.fulfillment_mode === "made_to_order_only" && Boolean(pRow?.show_on_bespoke_page);
    if (!pRow || (pRow.is_published === false && !isOrderableOnBespoke)) {
      return {
        ok: false,
        status: 404,
        code: "PRODUCT_NOT_FOUND",
        error: `Product "${reqItem.productId}" is unavailable or unpublished.`,
      };
    }

    // Resolve variant & combo from authoritative product row
    const variants: ProductVariant[] = Array.isArray(pRow.variants) ? pRow.variants : [];
    const hasColors = variants.some((v) => v.type === "color");

    let matchedColor: ProductVariant | null = null;
    let matchedCombo: ProductCombo | null = null;
    let activeMode: "solo" | "paired" = "solo";

    if (reqItem.comboId && reqItem.comboId.trim() && reqItem.comboId !== "base") {
      activeMode = "paired";
      if (hasColors) {
        matchedColor =
          variants.find(
            (v) => v.type === "color" && v.id === (reqItem.variantId || "main-color"),
          ) ||
          variants.find((v) => v.type === "color") ||
          null;
        matchedCombo =
          matchedColor?.combos?.find((c) => c.id === reqItem.comboId) || null;
      } else {
        const fitWrap = variants.find((v) => v.type === "fit_combo");
        matchedCombo = fitWrap?.combos?.find((c) => c.id === reqItem.comboId) || null;
      }
      if (!matchedCombo) {
        return {
          ok: false,
          status: 400,
          code: "OPTION_UNAVAILABLE",
          error: `Selected combo option is not valid for ${pRow.name}.`,
        };
      }
    } else if (hasColors) {
      activeMode = "solo";
      const targetVarId = reqItem.variantId?.trim() || "main-color";
      matchedColor =
        variants.find((v) => v.type === "color" && v.id === targetVarId) || null;
      if (!matchedColor) {
        return {
          ok: false,
          status: 400,
          code: "OPTION_UNAVAILABLE",
          error: `Selected color variant is not valid for ${pRow.name}.`,
        };
      }
    }

    // Validate size
    const sizes = Array.isArray(pRow.sizes) ? pRow.sizes : [];
    const reqSize = String(reqItem.size || "Standard").trim();
    if (sizes.length > 0) {
      const matchedSize = sizes.find(
        (s: any) => String(s.name).toLowerCase() === reqSize.toLowerCase(),
      );
      if (!matchedSize || matchedSize.available === false) {
        return {
          ok: false,
          status: 400,
          code: "OPTION_UNAVAILABLE",
          error: `Size "${reqSize}" is not available for ${pRow.name}.`,
        };
      }
    }

    // Evaluate Single Inventory Authority for this SKU
    const skuStatus = getVariantStockStatus(
      pRow,
      matchedColor,
      matchedCombo,
      activeMode,
      reqItem.fulfillmentChoice,
    );

    const activeReserved = reservedBySku.get(skuStatus.skuKey) || 0;
    const alreadyRequestedInCart = requestedRtwBySku.get(skuStatus.skuKey) || 0;
    const availableStock = Math.max(
      0,
      skuStatus.availablePhysicalStock - activeReserved - alreadyRequestedInCart,
    );

    const displayName =
      matchedCombo?.productNameOverride?.trim() ||
      (matchedColor?.id !== "main-color" && matchedColor?.productNameOverride?.trim()) ||
      pRow.name;

    let itemFulfillmentType: ItemFulfillmentType = "ready_to_wear";

    if (skuStatus.fulfillmentMode === "made_to_order_only") {
      if (qty > skuStatus.mtoMaxQtyPerOrder) {
        return {
          ok: false,
          status: 400,
          code: "MTO_LIMIT_EXCEEDED",
          error: `"${displayName}" has a maximum Made to Order limit of ${skuStatus.mtoMaxQtyPerOrder} per order.`,
        };
      }
      itemFulfillmentType = "made_to_order";
    } else if (skuStatus.fulfillmentMode === "stock_then_made_to_order") {
      if (availableStock <= 0 || reqItem.fulfillmentChoice === "made_to_order") {
        // Either 0 physical stock left (automatic MTO fallback) OR customer explicitly chose MTO
        if (qty > skuStatus.mtoMaxQtyPerOrder) {
          return {
            ok: false,
            status: 400,
            code: "MTO_LIMIT_EXCEEDED",
            error: `"${displayName}" has a maximum Made to Order limit of ${skuStatus.mtoMaxQtyPerOrder} per order.`,
          };
        }
        itemFulfillmentType = "made_to_order";
      } else if (qty > availableStock) {
        // Decision 1 — Partial Stock:
        // 0 < availableStock < qty and customer has NOT explicitly selected Made to Order!
        partialStockConflicts.push({
          productId: pRow.id,
          skuKey: skuStatus.skuKey,
          itemName: displayName,
          requestedQty: qty,
          availableStock,
          mtoMaxQtyPerOrder: skuStatus.mtoMaxQtyPerOrder,
          leadDays: skuStatus.leadDays,
        });
        continue;
      } else {
        itemFulfillmentType = "ready_to_wear";
      }
    } else {
      // stock_only
      if (availableStock < qty) {
        return {
          ok: false,
          status: 409,
          code: "INSUFFICIENT_STOCK",
          error:
            availableStock === 0
              ? `"${displayName}" is currently out of stock.`
              : `Only ${availableStock} unit(s) of "${displayName}" available in stock.`,
          details: {
            productId: pRow.id,
            skuKey: skuStatus.skuKey,
            availableStock,
            requestedQty: qty,
          },
        };
      }
      itemFulfillmentType = "ready_to_wear";
    }

    if (itemFulfillmentType === "ready_to_wear") {
      requestedRtwBySku.set(skuStatus.skuKey, alreadyRequestedInCart + qty);
      const existingRes = reservationsToCreateMap.get(skuStatus.skuKey);
      if (existingRes) {
        existingRes.quantity += qty;
      } else {
        reservationsToCreateMap.set(skuStatus.skuKey, {
          productId: pRow.id,
          variantId: skuStatus.variantId,
          comboId: skuStatus.comboId,
          skuKey: skuStatus.skuKey,
          quantity: qty,
        });
      }
    }

    const unitPrice = skuStatus.unitPrice;
    subtotal += unitPrice * qty;
    totalWeightKg += Number(pRow.weight_kg ?? 0.5) * qty;

    const itemImage =
      matchedCombo?.thumbnailUrl ||
      matchedCombo?.images?.[0] ||
      matchedColor?.thumbnailUrl ||
      matchedColor?.images?.[0] ||
      pRow.image;

    const isMto = itemFulfillmentType === "made_to_order";

    resolvedOrderItems.push({
      productId: pRow.id,
      variantId: skuStatus.variantId !== "base" ? skuStatus.variantId : undefined,
      comboId: skuStatus.comboId !== "base" ? skuStatus.comboId : undefined,
      skuKey: skuStatus.skuKey,
      name: displayName,
      color: matchedColor && matchedColor.id !== "main-color" ? matchedColor.name : matchedColor?.name || undefined,
      colorHex: matchedColor?.colorHex,
      combo: matchedCombo?.name,
      size: reqSize,
      fit: reqItem.fit?.trim() || undefined,
      wearTag: pRow.wear_tag || "unisex",
      price: unitPrice,
      quantity: qty,
      image: itemImage,
      fulfillmentType: itemFulfillmentType,
      isMadeToOrder: isMto,
      leadDays: isMto ? skuStatus.leadDays : undefined,
      productionStatus: isMto ? "queued" : "not_applicable",
      isBespoke: isMto || undefined,
      bespokeLeadDays: isMto ? skuStatus.leadDays : undefined,
    });
  }

  if (partialStockConflicts.length > 0) {
    const first = partialStockConflicts[0];
    return {
      ok: false,
      status: 409,
      code: "PARTIAL_STOCK_CHOICE_REQUIRED",
      error: `Only ${first.availableStock} unit(s) of "${first.itemName}" are available for immediate Ready to Wear dispatch. Please choose either the remaining ${first.availableStock} Ready to Wear unit(s) or order all ${first.requestedQty} as Made to Order (${first.leadDays} days production).`,
      partialStockConflicts,
    };
  }

  // 4. Server-authoritative Promotion Code validation
  let discount = 0;
  let validatedPromoCode: string | null = null;
  if (input.promotionCode && input.promotionCode.trim()) {
    const codeClean = input.promotionCode.trim().toUpperCase();
    const { data: promoRow } = await supabaseAdmin
      .from("promotion_codes")
      .select("*")
      .ilike("code", codeClean)
      .eq("active", true)
      .maybeSingle();

    if (!promoRow) {
      return {
        ok: false,
        status: 400,
        code: "PROMO_INVALID",
        error: "Invalid or inactive promotion code.",
      };
    }
    if (promoRow.expires_at && new Date(promoRow.expires_at).getTime() < Date.now()) {
      return {
        ok: false,
        status: 400,
        code: "PROMO_INVALID",
        error: "This promotion code has expired.",
      };
    }
    const pct = Number(promoRow.percentage || 0);
    discount = Math.round((subtotal * pct) / 100);
    validatedPromoCode = promoRow.code;
  }

  // 5. Server-authoritative Shipping Cost calculation
  let shippingCost = 0;
  if (input.shippingDestination === "international") {
    if (input.shippingOption === "dhl") {
      if (
        !input.destinationDetails?.city?.trim() ||
        !input.destinationDetails?.countryCode?.trim()
      ) {
        return {
          ok: false,
          status: 400,
          code: "SHIPPING_ERROR",
          error: "City and country are required for international DHL shipping.",
        };
      }
      try {
        const calcFn =
          params.calculateShippingRate ||
          (async (p) => {
            const { getShippingRates } = await import("./dhl");
            return getShippingRates(p);
          });
        const rateRes = await calcFn({
          destination: {
            city: input.destinationDetails.city.trim(),
            postalCode: input.destinationDetails.postalCode?.trim() || "",
            countryCode: input.destinationDetails.countryCode.trim(),
          },
          weightKg: Math.max(0.5, totalWeightKg),
        });
        shippingCost = Math.max(0, Math.round(Number(rateRes.price || 0)));
      } catch (err) {
        return {
          ok: false,
          status: 400,
          code: "SHIPPING_ERROR",
          error:
            err instanceof Error
              ? err.message
              : "Failed to calculate international DHL shipping rate.",
        };
      }
    } else {
      shippingCost = 0; // Custom sales shipping arranged after checkout
    }
  }

  const total = Math.max(0, subtotal - discount + shippingCost);
  const amountPesewas = Math.round(total * 100);

  const sanitizedFirstItem = (resolvedOrderItems[0]?.name || "ITEM")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 20)
    .toUpperCase();
  const uniqueSuffix = crypto.randomBytes(4).toString("hex").toUpperCase();
  const paymentRef = `ORDER-${sanitizedFirstItem}-${uniqueSuffix}`;

  const reservationsArray = [...reservationsToCreateMap.values()].sort((a, b) =>
    a.skuKey.localeCompare(b.skuKey),
  );

  // 6. Execute Atomic RPC create_order_with_reservations
  const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc(
    "create_order_with_reservations",
    {
      p_idempotency_key: cleanIdempotencyKey || null,
      p_user_id: input.userId,
      p_customer_name: input.customerName.trim(),
      p_customer_email: input.customerEmail.trim(),
      p_customer_phone: input.customerPhone.trim(),
      p_shipping_address: input.shippingAddress.trim(),
      p_items: resolvedOrderItems,
      p_subtotal: subtotal,
      p_discount: discount,
      p_shipping_cost: shippingCost,
      p_total: total,
      p_promotion_code: validatedPromoCode,
      p_notes: input.notes?.trim() || null,
      p_payment_ref: paymentRef,
      p_reservations: reservationsArray,
      p_reservation_ttl_seconds: input.reservationTtlSeconds ?? 900,
    },
  );

  if (rpcErr) {
    const msg = String(rpcErr.message || "");
    if (msg.includes("INSUFFICIENT_STOCK")) {
      return {
        ok: false,
        status: 409,
        code: "INSUFFICIENT_STOCK",
        error: "One or more items in your cart just sold out or are reserved by another shopper.",
      };
    }
    return {
      ok: false,
      status: 500,
      code: "SERVER_ERROR",
      error: msg || "Could not create order.",
    };
  }

  const createdOrder = (rpcData as any)?.order;
  const finalRef = createdOrder?.payment_ref || paymentRef;
  const finalTotal = Number(createdOrder?.total ?? total);

  return {
    ok: true,
    status: 200,
    idempotent: Boolean((rpcData as any)?.idempotent),
    order: createdOrder,
    paystackReference: finalRef,
    amountPesewas: Math.round(finalTotal * 100),
  };
}

// ── 2) Shared Payment Verification & Reconciliation (Callback + Webhook) ─────

export async function verifyAndReconcileOrderPayment(params: {
  supabaseAdmin: any;
  emailSender: OrderEmailSender;
  reference: string;
  orderId?: string;
  paystackSecretKey: string;
  verifyPaystack?: PaystackOrderVerifier;
}): Promise<{
  ok: boolean;
  status: number;
  error?: string;
  alreadyPaid?: boolean;
  orderStatus?: string;
  stockConflictFlagged?: boolean;
  order?: Record<string, any>;
  outboxProcessed?: number;
}> {
  const ref = String(params.reference || "").trim();
  const explicitOrderId = String(params.orderId || "").trim();

  if (!ref) {
    return { ok: false, status: 400, error: "Missing payment reference." };
  }

  // 1. Locate order by id or payment_ref
  let orderRow: Record<string, any> | null = null;
  if (explicitOrderId) {
    const { data } = await params.supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", explicitOrderId)
      .maybeSingle();
    orderRow = data;
  } else {
    const { data } = await params.supabaseAdmin
      .from("orders")
      .select("*")
      .eq("payment_ref", ref)
      .maybeSingle();
    orderRow = data;
  }

  if (!orderRow) {
    return { ok: false, status: 404, error: "Order not found." };
  }

  if (orderRow.payment_ref && orderRow.payment_ref.trim() !== "" && orderRow.payment_ref.trim() !== ref) {
    return {
      ok: false,
      status: 400,
      error: "Payment reference does not match the order's assigned reference.",
    };
  }

  // 2. Verify with Paystack server-side
  const verifier = params.verifyPaystack || defaultPaystackOrderVerifier;
  const verifyRes = await verifier(ref, params.paystackSecretKey);
  const tx = verifyRes.data;

  if (!verifyRes.ok || !verifyRes.status || tx?.status !== "success") {
    return {
      ok: false,
      status: 400,
      error: "Payment verification failed.",
    };
  }

  if (tx.currency && String(tx.currency).toUpperCase() !== "GHS") {
    return {
      ok: false,
      status: 400,
      error: `Invalid payment currency (${tx.currency}). Expected GHS.`,
    };
  }

  const expectedPesewas = Math.round(Number(orderRow.total) * 100);
  const verifiedPesewas =
    tx.amount != null ? Number(tx.amount) : expectedPesewas;

  if (verifiedPesewas !== expectedPesewas) {
    return {
      ok: false,
      status: 400,
      error: `Payment amount mismatch. Expected ${expectedPesewas} pesewas, received ${verifiedPesewas}.`,
    };
  }

  const metaOrderId =
    tx.metadata?.orderId?.trim() ||
    tx.metadata?.order_id?.trim() ||
    tx.metadata?.custom_fields?.find((f) => f.variable_name === "order_id")?.value?.trim() ||
    "";

  if (metaOrderId && metaOrderId !== orderRow.id) {
    return {
      ok: false,
      status: 400,
      error: "Payment metadata order_id does not match this order.",
    };
  }

  // 3. Execute atomic database reconciliation (idempotent lock + reservation settlement + outbox insert)
  const adminEmail = getOrdersAdminEmail();
  const { data: recData, error: recErr } = await params.supabaseAdmin.rpc(
    "reconcile_order_payment",
    {
      p_order_id: orderRow.id,
      p_payment_ref: ref,
      p_verified_amount_pesewas: verifiedPesewas,
      p_admin_email: adminEmail,
    },
  );

  if (recErr || !recData) {
    return {
      ok: false,
      status: 500,
      error: recErr?.message || "Failed to reconcile order payment.",
    };
  }

  if (!recData.ok) {
    return {
      ok: false,
      status: Number(recData.status || 400),
      error: recData.error || "Order payment reconciliation rejected.",
    };
  }

  // 4. Flush pending outbox notifications (durable: if this fails or crashes, cron/worker retries)
  let outboxProcessed = 0;
  try {
    const flushRes = await processOrderNotificationOutbox({
      supabaseAdmin: params.supabaseAdmin,
      emailSender: params.emailSender,
      orderId: orderRow.id,
      workerId: `reconcile-${orderRow.id.slice(0, 8)}`,
    });
    outboxProcessed = flushRes.sentCount;
  } catch (err) {
    console.error("Outbox immediate flush error (will be retried by outbox worker):", err);
  }

  return {
    ok: true,
    status: 200,
    alreadyPaid: Boolean(recData.alreadyPaid),
    orderStatus: recData.orderStatus,
    stockConflictFlagged: Boolean(recData.stockConflictFlagged),
    order: recData.order,
    outboxProcessed,
  };
}

// ── 3) Durable Order Notification Outbox Worker (Atomic Claims + Backoff) ────

export async function processOrderNotificationOutbox(params: {
  supabaseAdmin: any;
  emailSender: OrderEmailSender;
  orderId?: string;
  limit?: number;
  workerId?: string;
}): Promise<{
  claimedCount: number;
  sentCount: number;
  failedCount: number;
  errors: string[];
}> {
  const workerId = params.workerId || `worker-${crypto.randomUUID().slice(0, 8)}`;
  const { data: claimedRows, error: claimErr } = await params.supabaseAdmin.rpc(
    "claim_order_notification_outbox_batch",
    {
      p_worker_id: workerId,
      p_limit: params.limit ?? 20,
      p_order_id: params.orderId ?? null,
    },
  );

  if (claimErr || !Array.isArray(claimedRows) || claimedRows.length === 0) {
    return { claimedCount: 0, sentCount: 0, failedCount: 0, errors: [] };
  }

  const fromEmail = getOrdersFromEmail();
  const adminOrdersUrl = getAdminOrdersUrl();

  let sentCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const outboxRow of claimedRows) {
    try {
      const { data: orderData, error: ordErr } = await params.supabaseAdmin
        .from("orders")
        .select("*")
        .eq("id", outboxRow.order_id)
        .maybeSingle();

      if (ordErr || !orderData) {
        throw new Error(`Order ${outboxRow.order_id} not found for outbox item ${outboxRow.id}`);
      }

      const displayOrderId =
        orderData.order_number || String(orderData.id).slice(0, 8).toUpperCase();
      const isAdminEvent = String(outboxRow.event_key).endsWith(":admin");
      const isConflictHold = Boolean(orderData.stock_conflict_flagged);

      const emailProps = {
        customerName: orderData.customer_name || "Customer",
        orderId: displayOrderId,
        items: Array.isArray(orderData.items) ? orderData.items : [],
        subtotal: orderData.subtotal != null ? Number(orderData.subtotal) : undefined,
        discount: Number(orderData.discount || 0),
        shippingCost: orderData.shipping_cost != null ? Number(orderData.shipping_cost) : 0,
        total: Number(orderData.total || 0),
        shippingAddress: orderData.shipping_address || "TBD",
        dateOrdered: orderData.paid_at || orderData.created_at || new Date().toISOString(),
        isAdmin: isAdminEvent,
        adminOrdersUrl,
        stockConflictFlagged: isConflictHold,
      };

      const subject = isAdminEvent
        ? isConflictHold
          ? `ACTION REQUIRED: Order Hold (Stock Conflict) - ${displayOrderId}`
          : `New Order - ${displayOrderId}`
        : `Order Confirmation - ${displayOrderId}`;

      // Deterministic Resend Idempotency-Key per logical outbox record
      const idempotencyKey = `joey-order-outbox-${outboxRow.order_id}-${outboxRow.event_key}`.replace(
        /[^a-zA-Z0-9_-]/g,
        "-",
      );

      const sendRes = await params.emailSender.send(
        {
          from: `JOEY The brand <${fromEmail}>`,
          to: outboxRow.recipient,
          subject,
          react: OrderConfirmationEmail(emailProps),
          headers: {
            "X-Entity-Ref-ID": idempotencyKey,
          },
        },
        { idempotencyKey },
      );

      if (sendRes?.error) {
        throw new Error(sendRes.error.message || "Resend API error");
      }

      await params.supabaseAdmin
        .from("order_notification_outbox")
        .update({
          status: "sent",
          provider_message_id: sendRes?.data?.id || null,
          locked_until: null,
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", outboxRow.id);

      sentCount += 1;
    } catch (err) {
      failedCount += 1;
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push(`${outboxRow.event_key}: ${errMsg}`);

      const attempts = Number(outboxRow.attempt_count || 1);
      const maxAttempts = Number(outboxRow.max_attempts || 6);
      const exhausted = attempts >= maxAttempts;
      // Exponential backoff: 30s, 2m, 8m, 32m, 2h
      const backoffSeconds = Math.min(7200, Math.pow(4, Math.max(0, attempts - 1)) * 30);
      const nextAttemptIso = new Date(Date.now() + backoffSeconds * 1000).toISOString();

      await params.supabaseAdmin
        .from("order_notification_outbox")
        .update({
          status: exhausted ? "failed" : "pending",
          last_error: errMsg,
          locked_until: null,
          next_attempt_at: nextAttemptIso,
          updated_at: new Date().toISOString(),
        })
        .eq("id", outboxRow.id);
    }
  }

  return {
    claimedCount: claimedRows.length,
    sentCount,
    failedCount,
    errors,
  };
}
