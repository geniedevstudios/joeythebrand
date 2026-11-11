export const WOMENS_THICK_SIZES = ["S", "M", "L", "XL", "Custom"] as const;
export const WOMENS_UK_SIZES = [
  "UK 8",
  "UK 10",
  "UK 12",
  "UK 14",
  "UK 16",
  "UK 18",
  "UK 20",
  "UK 22",
  "Custom",
] as const;
export const MENS_DEFAULT_SIZE_NAMES = ["S", "M", "L", "XL", "XXL", "Custom"] as const;

const ALPHA_TO_UK: Record<string, string> = {
  XS: "UK 6",
  S: "UK 8",
  M: "UK 10",
  L: "UK 12",
  XL: "UK 14",
  XXL: "UK 16",
  "2XL": "UK 16",
  "2X": "UK 16",
  "3XL": "UK 18",
  XXXL: "UK 18",
  "3X": "UK 18",
  "4XL": "UK 20",
  XXXXL: "UK 20",
  "4X": "UK 20",
  "5XL": "UK 22",
  XXXXXL: "UK 22",
  "5X": "UK 22",
};

const UK_TO_ALPHA: Record<string, string> = {
  "UK 6": "XS",
  "UK 8": "S",
  "UK 10": "M",
  "UK 12": "L",
  "UK 14": "XL",
  "UK 16": "XXL",
  "UK 18": "3XL",
  "UK 20": "4XL",
  "UK 22": "5XL",
};

export type SizeLike = { name?: string; available?: boolean };
export type WearSizeProduct = {
  wearTag?: string;
  wear_tag?: string;
  sizes?: SizeLike[] | null;
};

export function normalizeSizeName(raw: string): string {
  const t = String(raw || "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  if (/^custom$/i.test(t)) return "Custom";
  const uk = /^UK\s*(\d+)(?:\s*[\/\\]\s*US\s*\d+)?$/i.exec(t);
  if (uk) return `UK ${uk[1]}`;
  return t.toUpperCase();
}

export function sizeAliases(raw: string): string[] {
  const n = normalizeSizeName(raw);
  if (!n) return [];
  const aliases = new Set<string>([n]);
  if (ALPHA_TO_UK[n]) aliases.add(ALPHA_TO_UK[n]);
  if (UK_TO_ALPHA[n]) aliases.add(UK_TO_ALPHA[n]);
  return [...aliases];
}

function wearTagOf(product: WearSizeProduct | null | undefined): string {
  return String(product?.wearTag || product?.wear_tag || "").trim().toLowerCase();
}

function availableSizes(product: WearSizeProduct | null | undefined): SizeLike[] {
  const sizes = Array.isArray(product?.sizes) ? product.sizes : [];
  return sizes.filter((s) => s?.name && s.available !== false);
}

function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    const n = normalizeSizeName(name);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n === "CUSTOM" ? "Custom" : n);
  }
  return out;
}

function hasCustom(available: SizeLike[]): boolean {
  return available.some((s) => normalizeSizeName(String(s.name)) === "Custom");
}

function thickSizes(includeCustom: boolean): string[] {
  return includeCustom ? [...WOMENS_THICK_SIZES] : ["S", "M", "L", "XL"];
}

/** Storefront buttons: Standard uses UK names, Thick uses S–XL. */
export function getStorefrontSizes(
  product: WearSizeProduct | null | undefined,
  fit?: string,
): string[] {
  const wear = wearTagOf(product);
  const available = availableSizes(product);
  const customOn = available.length === 0 || hasCustom(available);

  if (wear === "womens") {
    if (fit === "Thick") return thickSizes(true);
    if (available.length === 0) return [...WOMENS_UK_SIZES];
    return uniqueNames(
      available.map((s) => {
        const n = normalizeSizeName(String(s.name));
        if (n === "Custom") return "Custom";
        return ALPHA_TO_UK[n] || n;
      }),
    );
  }

  if (wear === "unisex") {
    if (fit === "Women") return thickSizes(customOn);
    if (available.length > 0) return uniqueNames(available.map((s) => String(s.name)));
    return [...MENS_DEFAULT_SIZE_NAMES];
  }

  if (available.length > 0) return uniqueNames(available.map((s) => String(s.name)));
  return [...MENS_DEFAULT_SIZE_NAMES];
}

export function isSizeAllowedForProduct(
  product: WearSizeProduct | null | undefined,
  size: string,
  fit?: string,
): boolean {
  const req = normalizeSizeName(size);
  if (!req) return false;
  const wear = wearTagOf(product);
  const fitName = String(fit || "").trim();

  if (wear === "womens" && fitName === "Thick") {
    return WOMENS_THICK_SIZES.some((s) => s === req || (req === "CUSTOM" && s === "Custom"));
  }
  if (wear === "unisex" && fitName === "Women") {
    return WOMENS_THICK_SIZES.some((s) => s === req || (req === "CUSTOM" && s === "Custom"));
  }

  const sizes = Array.isArray(product?.sizes) ? product.sizes : [];
  if (sizes.length === 0) return true;

  const aliases = sizeAliases(req);
  return aliases.some((alias) =>
    sizes.some((s) => {
      if (!s?.name || s.available === false) return false;
      return sizeAliases(String(s.name)).includes(alias);
    }),
  );
}

export function displaySizeLabel(raw: string, fit?: string, wearTag?: string): string {
  const n = normalizeSizeName(raw);
  if (!n) return "";
  if (n === "Custom" || n === "CUSTOM") return "Custom";
  if (fit === "Standard" && wearTag === "womens") {
    return ALPHA_TO_UK[n] || n;
  }
  return n;
}

export type SizeStockLike = { size?: string; quantity?: number };

/** True when this colour (or product leaf) tracks inventory per size. */
export function hasSizeStockTracking(
  sizeStock: SizeStockLike[] | null | undefined,
): boolean {
  return Array.isArray(sizeStock) && sizeStock.length > 0;
}

/**
 * Match a storefront size label (UK / alpha / Custom) to a sizeStock row.
 * Returns the stored row size string (canonical for SKUs) and remaining units.
 */
export function findSizeStockEntry(
  sizeStock: SizeStockLike[] | null | undefined,
  requestedSize: string,
): { size: string; quantity: number } | null {
  if (!hasSizeStockTracking(sizeStock)) return null;
  const aliases = new Set(
    sizeAliases(requestedSize).map((alias) => normalizeSizeName(alias)),
  );
  if (!aliases.size) return null;
  for (const row of sizeStock!) {
    const stored = String(row?.size || "").trim();
    if (!stored) continue;
    const rowAliases = sizeAliases(stored).map((alias) => normalizeSizeName(alias));
    if (rowAliases.some((alias) => aliases.has(alias))) {
      return {
        size: stored,
        quantity: Math.max(0, Number(row?.quantity) || 0),
      };
    }
  }
  return null;
}

/** Units left for a size on a colourway; null when size-level stock is not tracked. */
export function getSizeStockQuantity(
  sizeStock: SizeStockLike[] | null | undefined,
  requestedSize: string,
): number | null {
  if (!hasSizeStockTracking(sizeStock)) return null;
  const entry = findSizeStockEntry(sizeStock, requestedSize);
  return entry ? entry.quantity : 0;
}
