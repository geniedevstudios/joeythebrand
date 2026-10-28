import type {
  Product,
  ProductCombo,
  ProductFulfillmentMode,
  ProductVariant,
  ItemFulfillmentType,
} from "./types";

export interface ResolvedVariantStockStatus {
  skuKey: string;
  variantId: string;
  comboId: string;
  unitPrice: number;
  fulfillmentMode: ProductFulfillmentMode;
  /** True when the selected option is currently fulfilled as Made to Order (either made_to_order_only or 0-stock fallback). */
  isMadeToOrderProduct: boolean;
  /** Legacy alias for backwards compatibility across storefront components. */
  isBespokeProduct: boolean;
  /** Physical ready-to-wear stock for the selected SKU. */
  availablePhysicalStock: number;
  /** Max quantity allowed in selector (availablePhysicalStock for RTW, mtoMaxQtyPerOrder for MTO). */
  maxStock: number;
  /** Max quantity allowed when ordering as Made to Order. */
  mtoMaxQtyPerOrder: number;
  /** Production lead time in days for Made to Order. */
  leadDays: number;
  /** Legacy alias for leadDays. */
  bespokeLeadDays: number;
  /** True when physical stock is 0. */
  isSelectedOutOfStock: boolean;
  /** True when the item cannot be purchased at all (stock_only and physical stock is 0). */
  isUnorderable: boolean;
  /** True when fulfillmentMode is stock_then_made_to_order and availablePhysicalStock > 0 (partial stock choice applies if qty > availablePhysicalStock). */
  canFallbackToMadeToOrder: boolean;
}

export function resolveProductFulfillmentMode(product: any): ProductFulfillmentMode {
  if (
    product?.fulfillmentMode === "made_to_order_only" ||
    product?.fulfillment_mode === "made_to_order_only"
  ) {
    return "made_to_order_only";
  }
  if (
    product?.fulfillmentMode === "stock_then_made_to_order" ||
    product?.fulfillment_mode === "stock_then_made_to_order"
  ) {
    return "stock_then_made_to_order";
  }
  if (
    product?.fulfillmentMode === "stock_only" ||
    product?.fulfillment_mode === "stock_only"
  ) {
    return "stock_only";
  }
  if (product?.bespokeAvailable || product?.bespoke_available) {
    return "stock_then_made_to_order";
  }
  return "stock_only";
}

export function resolveLeafFulfillmentMode(
  _leaf: unknown,
  parentMode: ProductFulfillmentMode,
): ProductFulfillmentMode {
  return parentMode;
}

/**
 * Decision 2 — Combo Pricing:
 * Positive combo.price (> 0) overrides product.price. Otherwise inherit product.price.
 */
export function resolveUnitPrice(
  product: { price?: number } | null | undefined,
  currentCombo?: { price?: number } | null,
): number {
  const basePrice = Number(product?.price ?? 0);
  const comboPrice = Number(currentCombo?.price ?? 0);
  if (Number.isFinite(comboPrice) && comboPrice > 0) {
    return comboPrice;
  }
  return Number.isFinite(basePrice) ? basePrice : 0;
}

export function buildSkuKey(
  productId: string,
  variantId?: string | null,
  comboId?: string | null,
): string {
  const v = variantId && variantId.trim() ? variantId.trim() : "base";
  const c = comboId && comboId.trim() ? comboId.trim() : "base";
  return `${productId}::${v}::${c}`;
}

/**
 * Single Inventory Authority:
 * Resolves exact physical stock, fulfilment mode, price, and MTO limits for:
 *  1) Simple Product (no variants) -> base::base
 *  2) Fits-Only Product -> Solo ("Original") uses base::base; Paired combo uses fit-combo::<combo.id>
 *  3) Colors-Only Product -> <color.id>::base
 *  4) Matrix Product -> Solo uses <color.id>::base; Paired combo uses <color.id>::<combo.id>
 */
export function getVariantStockStatus(
  product: any,
  currentColor: any,
  currentCombo: any,
  activeMode: "solo" | "paired",
  forcedFulfillmentChoice?: ItemFulfillmentType,
): ResolvedVariantStockStatus {
  if (!product) {
    return {
      skuKey: "unknown::base::base",
      variantId: "base",
      comboId: "base",
      unitPrice: 0,
      fulfillmentMode: "stock_only",
      isMadeToOrderProduct: false,
      isBespokeProduct: false,
      availablePhysicalStock: 0,
      maxStock: 0,
      mtoMaxQtyPerOrder: 5,
      leadDays: 14,
      bespokeLeadDays: 14,
      isSelectedOutOfStock: true,
      isUnorderable: true,
      canFallbackToMadeToOrder: false,
    };
  }

  const productMode = resolveProductFulfillmentMode(product);
  const defaultLeadDays = Number(
    product.madeToOrderLeadDays ??
      product.made_to_order_lead_days ??
      product.bespokeLeadDays ??
      product.bespoke_lead_days ??
      14,
  );
  const mtoMaxQtyPerOrder = Math.max(
    1,
    Number(product.mtoMaxQtyPerOrder ?? product.mto_max_qty_per_order ?? 5),
  );

  const variants: ProductVariant[] = Array.isArray(product.variants) ? product.variants : [];
  const hasColorVariants = variants.some((v) => v.type === "color");

  let resolvedVariantId = "base";
  let resolvedComboId = "base";
  let physicalStock = 0;
  let effectiveMode: ProductFulfillmentMode = productMode;
  let leadDays = defaultLeadDays;

  if (activeMode === "paired" && currentCombo) {
    resolvedVariantId = currentColor?.id || "fit-combo";
    resolvedComboId = currentCombo.id || "base";
    const colorMode = currentColor
      ? resolveLeafFulfillmentMode(currentColor, productMode)
      : productMode;
    effectiveMode = resolveLeafFulfillmentMode(currentCombo, colorMode);
    leadDays = Number(
      currentCombo.leadDays ??
        currentCombo.bespokeLeadDays ??
        currentColor?.leadDays ??
        currentColor?.bespokeLeadDays ??
        defaultLeadDays,
    );
    const comboOut = Boolean(currentCombo.isOutOfStock);
    const comboQty =
      typeof currentCombo.quantity === "number" ? Math.max(0, currentCombo.quantity) : 0;
    physicalStock = comboOut ? 0 : comboQty;
  } else if (hasColorVariants && currentColor) {
    resolvedVariantId = currentColor.id || "main-color";
    resolvedComboId = "base";
    effectiveMode = resolveLeafFulfillmentMode(currentColor, productMode);
    leadDays = Number(
      currentColor.leadDays ?? currentColor.bespokeLeadDays ?? defaultLeadDays,
    );
    const hasExplicitColorQty = typeof currentColor.quantity === "number";
    const rawQty = hasExplicitColorQty
      ? Math.max(0, currentColor.quantity)
      : currentColor.id === "main-color" && typeof product.quantity === "number"
        ? Math.max(0, product.quantity)
        : 0;
    const colorOut =
      Boolean(currentColor.isOutOfStock) ||
      (!hasExplicitColorQty && currentColor.id === "main-color" && Boolean(product.isOutOfStock));
    physicalStock = colorOut ? 0 : rawQty;
  } else {
    // Simple product OR Fits-Only in "solo" ("Original") mode
    resolvedVariantId = "base";
    resolvedComboId = "base";
    effectiveMode = productMode;
    leadDays = defaultLeadDays;
    const prodOut = Boolean(product.isOutOfStock);
    const prodQty = typeof product.quantity === "number" ? Math.max(0, product.quantity) : 0;
    physicalStock = prodOut ? 0 : prodQty;
  }

  if (effectiveMode === "made_to_order_only") {
    physicalStock = 0;
  }

  const isSelectedOutOfStock = physicalStock <= 0;
  const canFallbackToMadeToOrder = effectiveMode === "stock_then_made_to_order";

  const isMadeToOrderProduct =
    effectiveMode === "made_to_order_only" ||
    (effectiveMode === "stock_then_made_to_order" &&
      (isSelectedOutOfStock || forcedFulfillmentChoice === "made_to_order"));

  const isUnorderable = effectiveMode === "stock_only" && isSelectedOutOfStock;

  const maxStock = isMadeToOrderProduct
    ? mtoMaxQtyPerOrder
    : effectiveMode === "stock_then_made_to_order"
      ? Math.max(physicalStock, mtoMaxQtyPerOrder)
      : physicalStock;

  const unitPrice = resolveUnitPrice(product, activeMode === "paired" ? currentCombo : null);
  const skuKey = buildSkuKey(product.id, resolvedVariantId, resolvedComboId);

  return {
    skuKey,
    variantId: resolvedVariantId,
    comboId: resolvedComboId,
    unitPrice,
    fulfillmentMode: effectiveMode,
    isMadeToOrderProduct,
    isBespokeProduct: isMadeToOrderProduct,
    availablePhysicalStock: physicalStock,
    maxStock,
    mtoMaxQtyPerOrder,
    leadDays,
    bespokeLeadDays: leadDays,
    isSelectedOutOfStock,
    isUnorderable,
    canFallbackToMadeToOrder,
  };
}

export function getIsSoloUnavailable(currentColor: any, product: any): boolean {
  if (!product) return false;
  const status = getVariantStockStatus(product, currentColor, null, "solo");
  return status.isSelectedOutOfStock;
}

/**
 * Evaluates whether a product card in grids should display "Made to Order", "Sold Out", or "Pick Me".
 */
export function getCardFulfillmentSummary(product: any): {
  isMadeToOrder: boolean;
  isSoldOut: boolean;
  leadDays: number;
} {
  if (!product) return { isMadeToOrder: false, isSoldOut: true, leadDays: 14 };
  const mode = resolveProductFulfillmentMode(product);
  const leadDays = Number(
    product.madeToOrderLeadDays ??
      product.made_to_order_lead_days ??
      product.bespokeLeadDays ??
      14,
  );
  if (mode === "made_to_order_only") {
    return { isMadeToOrder: true, isSoldOut: false, leadDays };
  }
  const qty = typeof product.quantity === "number" ? product.quantity : 0;
  const out = Boolean(product.isOutOfStock) || qty <= 0;
  if (mode === "stock_then_made_to_order" && out) {
    return { isMadeToOrder: true, isSoldOut: false, leadDays };
  }
  return { isMadeToOrder: false, isSoldOut: out, leadDays };
}

/**
 * Requirement 5 & 7:
 * The /bespoke Made to Order section must contain ONLY published and orderable
 * made_to_order_only products explicitly selected for that section.
 * Automatic stock-to-MTO fallback products must NEVER enter this section.
 */
export function isCuratedBespokeMtoProduct(product: Product | any): boolean {
  if (!product) return false;
  const mode = resolveProductFulfillmentMode(product);
  const showOnBespoke = Boolean(product.showOnBespokePage ?? product.show_on_bespoke_page);
  return mode === "made_to_order_only" && showOnBespoke;
}
