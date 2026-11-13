import type {
  Product,
  ProductCombo,
  ProductFulfillmentMode,
  ProductVariant,
  ItemFulfillmentType,
} from "./types";
import {
  findSizeStockEntry,
  getStorefrontSizes,
  hasSizeStockTracking,
  normalizeSizeName,
} from "./wearSizes";

export interface ResolvedVariantStockStatus {
  skuKey: string;
  variantId: string;
  comboId: string;
  /** Canonical size key used in skuKey / reservations when size stock is tracked. */
  sizeKey: string;
  unitPrice: number;
  fulfillmentMode: ProductFulfillmentMode;
  /** True when the selected option is currently fulfilled as Made to Order (either made_to_order_only or 0-stock fallback). */
  isMadeToOrderProduct: boolean;
  /** Legacy alias for backwards compatibility across storefront components. */
  isBespokeProduct: boolean;
  /** Physical ready-to-wear stock for the selected SKU (colour + size when tracked). */
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
  sizeKey?: string | null,
): string {
  const v = variantId && variantId.trim() ? variantId.trim() : "base";
  const c = comboId && comboId.trim() ? comboId.trim() : "base";
  const s = sizeKey && sizeKey.trim() ? sizeKey.trim() : "";
  return s ? `${productId}::${v}::${c}::${s}` : `${productId}::${v}::${c}`;
}

/**
 * Single Inventory Authority:
 * Resolves exact physical stock, fulfilment mode, price, and MTO limits for:
 *  1) Simple Product (no variants) -> base::base
 *  2) Fits-Only Product -> Solo ("Original") uses base::base; Paired combo uses fit-combo::<combo.id>
 *  3) Colors-Only Product -> <color.id>::base[::size]
 *  4) Matrix Product -> Solo uses <color.id>::base[::size]; Paired combo uses <color.id>::<combo.id>
 *
 * When a colourway has sizeStock and selectedSize is set, physical stock is that size’s units.
 */
export function getVariantStockStatus(
  product: any,
  currentColor: any,
  currentCombo: any,
  activeMode: "solo" | "paired",
  forcedFulfillmentChoice?: ItemFulfillmentType,
  selectedSize?: string | null,
): ResolvedVariantStockStatus {
  if (!product) {
    return {
      skuKey: "unknown::base::base",
      variantId: "base",
      comboId: "base",
      sizeKey: "",
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
  const color = currentColor ?? variants.find((v) => v.type === "color");

  let resolvedVariantId = "base";
  let resolvedComboId = "base";
  let physicalStock = 0;
  let sizeKey = "";
  let effectiveMode: ProductFulfillmentMode = productMode;
  let leadDays = defaultLeadDays;
  const requestedSize = String(selectedSize || "").trim();

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
  } else if (color) {
    resolvedVariantId = color.id || "main-color";
    resolvedComboId = "base";
    effectiveMode = resolveLeafFulfillmentMode(color, productMode);
    leadDays = Number(
      color.leadDays ?? color.bespokeLeadDays ?? defaultLeadDays,
    );
    const hasExplicitColorQty = typeof color.quantity === "number";
    const rawQty = hasExplicitColorQty
      ? Math.max(0, color.quantity)
      : color.id === "main-color" && typeof product.quantity === "number"
        ? Math.max(0, product.quantity)
        : 0;
    const colorOut =
      Boolean(color.isOutOfStock) ||
      (!hasSizeStockTracking(color.sizeStock) && !hasExplicitColorQty && color.id === "main-color" && Boolean(product.isOutOfStock));
    physicalStock = colorOut ? 0 : rawQty;

    if (hasSizeStockTracking(color.sizeStock)) {
      if (requestedSize) {
        const entry = findSizeStockEntry(color.sizeStock, requestedSize);
        sizeKey = entry?.size || normalizeSizeName(requestedSize);
        physicalStock = colorOut ? 0 : entry?.quantity ?? 0;
      } else {
        physicalStock = colorOut ? 0 : color.sizeStock.reduce(
          (total: number, row: { quantity: number }) => total + Math.max(0, Number(row.quantity) || 0),
          0,
        );
      }
    }
  } else {
    // Simple product OR Fits-Only in "solo" ("Original") mode
    resolvedVariantId = "base";
    resolvedComboId = "base";
    effectiveMode = productMode;
    leadDays = defaultLeadDays;
    const prodOut = Boolean(product.isOutOfStock ?? product.is_out_of_stock);
    const prodQty = typeof product.quantity === "number" ? Math.max(0, product.quantity) : 0;
    physicalStock = prodOut ? 0 : prodQty;

    const productSizeStock =
      (Array.isArray(product.sizeStock) && product.sizeStock) ||
      (Array.isArray(product.sizes)
        ? product.sizes
            .filter((s: any) => s?.name && typeof s.quantity === "number")
            .map((s: any) => ({ size: String(s.name), quantity: Number(s.quantity) || 0 }))
        : null);
    if (requestedSize && hasSizeStockTracking(productSizeStock)) {
      const entry = findSizeStockEntry(productSizeStock, requestedSize);
      sizeKey = entry?.size || normalizeSizeName(requestedSize);
      physicalStock = prodOut ? 0 : entry ? entry.quantity : 0;
    }
  }

  if (!sizeKey && requestedSize) {
    sizeKey = normalizeSizeName(requestedSize);
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
  const skuKey = buildSkuKey(product.id, resolvedVariantId, resolvedComboId, sizeKey);

  return {
    skuKey,
    variantId: resolvedVariantId,
    comboId: resolvedComboId,
    sizeKey,
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

/** Only offer sizes listed for the selected colourway. */
export function getVariantStorefrontSizes(
  product: Product,
  fit?: string,
  color?: ProductVariant | null,
): string[] {
  const sizes = getStorefrontSizes(product, fit);
  if (!hasSizeStockTracking(color?.sizeStock)) return sizes;
  return sizes.filter((size) => findSizeStockEntry(color?.sizeStock, size) !== null);
}

export function getIsSoloUnavailable(currentColor: any, product: any): boolean {
  if (!product) return false;
  const status = getVariantStockStatus(product, currentColor, null, "solo");
  return status.isUnorderable;
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
  const variants: ProductVariant[] = Array.isArray(product.variants) ? product.variants : [];
  const colors = variants.filter((variant) => variant.type === "color");
  const hasSoloStock = colors.length
    ? colors.some((color) => getVariantStockStatus(product, color, null, "solo").availablePhysicalStock > 0)
    : getVariantStockStatus(product, null, null, "solo").availablePhysicalStock > 0;
  const hasStock = hasSoloStock || variants.some((variant) =>
    variant.combos?.some((combo) =>
      getVariantStockStatus(product, variant.type === "color" ? variant : null, combo, "paired")
        .availablePhysicalStock > 0,
    ),
  );
  const out = !hasStock || (mode === "stock_only" && Boolean(product.isOutOfStock));
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
