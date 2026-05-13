export function formatSizeLabel(raw: string, fit?: string, wearTag?: string): string {
  const s = String(raw || "").trim().toUpperCase();
  
  // For women's Standard fit, map alpha sizes to UK/US numeric labels
  if (fit === "Standard" && wearTag === "womens") {
    if (s === "XS") return "UK 6";
    if (s === "S") return "UK 8";
    if (s === "M") return "UK 10";
    if (s === "L") return "UK 12";
    if (s === "XL") return "UK 14";
    if (s === "XXL" || s === "2XL" || s === "2X") return "UK 16";
    if (s === "3XL" || s === "XXXL" || s === "3X") return "UK 18";
    if (s === "4XL" || s === "XXXXL" || s === "4X") return "UK 20";
    if (s === "5XL" || s === "XXXXXL" || s === "5X") return "UK 22";
  }

  const m = /^UK(\d+)\s*(\/|\\)?\s*US(\d+)$/i.exec(s);
  if (m) return `UK ${m[1]}`;
  return s;
}
