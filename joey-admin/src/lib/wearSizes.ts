export const WOMENS_THICK_SIZES = ["S", "M", "L", "XL", "Custom"] as const;

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

export function normalizeSizeName(raw: string): string {
  const t = String(raw || "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  if (/^custom$/i.test(t)) return "Custom";
  const uk = /^UK\s*(\d+)(?:\s*[\/\\]\s*US\s*\d+)?$/i.exec(t);
  if (uk) return `UK ${uk[1]}`;
  return t.toUpperCase();
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
