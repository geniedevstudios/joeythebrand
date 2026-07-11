export function getVariantStockStatus(
  product: any,
  currentColor: any,
  currentCombo: any,
  activeMode: "solo" | "paired"
) {
  if (!product) {
    return { isBespokeProduct: false, maxStock: 0, bespokeLeadDays: 14, isSelectedOutOfStock: false };
  }

  const colorBespokeAvailable = currentColor?.bespokeAvailable ?? (currentColor?.combos?.length > 0 ? currentColor.combos.some((c: any) => c.bespokeAvailable) : product.bespokeAvailable);
  const parentOutOfStock = product.isOutOfStock || (typeof product.quantity === "number" ? product.quantity <= 0 : !!product.bespokeAvailable);
  
  const isComboOutOfStock = currentCombo?.isOutOfStock || (typeof currentCombo?.quantity === "number" ? currentCombo.quantity <= 0 : !!currentCombo?.bespokeAvailable);
  const isColorOutOfStock = currentColor?.isOutOfStock || (typeof currentColor?.quantity === "number" ? currentColor.quantity <= 0 : (currentColor?.combos?.length > 0 && colorBespokeAvailable ? true : parentOutOfStock));

  const isSelectedOutOfStock = activeMode === "paired" && currentCombo
    ? isComboOutOfStock
    : (activeMode === "solo" && currentColor?.id !== "main-color" ? isColorOutOfStock : product.isOutOfStock);

  const isSelectedBespokeAvailable = activeMode === "paired" && currentCombo
    ? currentCombo.bespokeAvailable ?? product.bespokeAvailable
    : (activeMode === "solo" && currentColor?.id !== "main-color" ? colorBespokeAvailable : product.bespokeAvailable);

  const isBespokeProduct = !!(isSelectedBespokeAvailable && isSelectedOutOfStock);
  const maxStock = isBespokeProduct ? 999 : (activeMode === "paired" && currentCombo && typeof currentCombo.quantity === "number" ? currentCombo.quantity : (activeMode === "solo" && currentColor?.id !== "main-color" && typeof currentColor?.quantity === "number" ? currentColor.quantity : product.quantity));
  const bespokeLeadDays = activeMode === "paired" && currentCombo && currentCombo.bespokeAvailable
    ? currentCombo.bespokeLeadDays ?? product.bespokeLeadDays ?? 14
    : (activeMode === "solo" && currentColor?.id !== "main-color" && currentColor?.bespokeAvailable ? currentColor.bespokeLeadDays ?? product.bespokeLeadDays ?? 14 : product.bespokeLeadDays ?? 14);

  return {
    isBespokeProduct,
    maxStock,
    bespokeLeadDays,
    isSelectedOutOfStock
  };
}

export function getIsSoloUnavailable(currentColor: any, product: any) {
  if (!product) return false;
  const colorBespokeAvailable = currentColor?.bespokeAvailable ?? (currentColor?.combos?.length > 0 ? currentColor.combos.some((c: any) => c.bespokeAvailable) : product.bespokeAvailable);
  const parentOutOfStock = product.isOutOfStock || (typeof product.quantity === "number" ? product.quantity <= 0 : !!product.bespokeAvailable);
  return currentColor?.isOutOfStock || (typeof currentColor?.quantity === "number" ? currentColor.quantity <= 0 : (currentColor?.combos?.length > 0 && colorBespokeAvailable ? true : parentOutOfStock));
}
