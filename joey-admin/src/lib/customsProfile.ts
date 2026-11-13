export const GARMENT_TYPES = {
  shirt: "Shirt or blouse",
  dress: "Dress",
  jacket: "Jacket or blazer",
  skirt: "Skirt",
  trousers: "Trousers or shorts",
  set: "Suit or ensemble",
  other: "Other garment",
} as const;

export type CustomsComponent = {
  description: string;
  garmentType: keyof typeof GARMENT_TYPES | "";
  construction: "" | "woven" | "knit" | "other";
  fibres: string;
  hsCode: string;
  inboundCountry?: string;
  inboundHsCode?: string;
  weightKg: number;
  valueShare: number;
};

export type CustomsProfile = {
  verified: boolean;
  components: CustomsComponent[];
};

export const blankCustomsComponent = (): CustomsComponent => ({
  description: "",
  garmentType: "",
  construction: "",
  fibres: "",
  hsCode: "",
  weightKg: 0,
  valueShare: 100,
});

export function validCustomsComponents(components: CustomsComponent[]) {
  return Array.isArray(components) && components.length > 0 &&
    components.every((line) =>
      line && typeof line.description === "string" && line.description.trim().length > 0 && line.description.trim().length <= 512 &&
      !/^(?:(?:men|women|children)(?:['’]s)?[\s-]*)?(?:wear|clothing|apparel|garments?|fashion|textiles)(?:[\s&-]+(?:wear|clothing|apparel|garments?|fashion|textiles))*[.!]?$/i.test(line.description.trim()) &&
      ((!line.inboundCountry && !line.inboundHsCode) ||
        (/^[A-Z]{2}$/.test(line.inboundCountry ?? "") && line.inboundCountry !== "GH" && /^\d{6,12}$/.test(line.inboundHsCode ?? ""))) &&
      Object.hasOwn(GARMENT_TYPES, line.garmentType) &&
      ["woven", "knit", "other"].includes(line.construction) &&
      typeof line.fibres === "string" && line.fibres.trim().length > 0 &&
      typeof line.hsCode === "string" && /^(61|62)\d{4}(?:\d{2}){0,3}$/.test(line.hsCode) &&
      (line.construction !== "woven" || line.hsCode.startsWith("62")) &&
      (line.construction !== "knit" || line.hsCode.startsWith("61")) &&
      Number.isFinite(line.weightKg) && line.weightKg > 0 &&
      Number.isFinite(line.valueShare) && line.valueShare > 0 && line.valueShare <= 100
    ) &&
    Math.abs(components.reduce((sum, line) => sum + line.valueShare, 0) - 100) < 0.00001;
}

// Suggestions identify subheadings to review. A broker-verified code can be entered directly.
export const HS_SUGGESTIONS: Partial<Record<CustomsComponent["garmentType"], string[][]>> = {
  shirt: [
    ["620520", "Men's non-knit cotton shirt"],
    ["620530", "Men's non-knit shirt of man-made fibres"],
    ["620590", "Men's non-knit shirt of other textile materials"],
    ["620630", "Women's non-knit cotton shirt or blouse"],
    ["620640", "Women's non-knit shirt or blouse of man-made fibres"],
    ["620690", "Women's non-knit shirt or blouse of other textile materials"],
    ["610510", "Men's knit cotton shirt"],
    ["610610", "Women's knit cotton shirt or blouse"],
    ["610910", "Knit cotton T-shirt"],
  ],
  dress: [
    ["620442", "Non-knit cotton dress"],
    ["620443", "Non-knit dress of synthetic fibres"],
    ["620444", "Non-knit dress of artificial fibres"],
    ["620449", "Non-knit dress of other textile materials"],
    ["610442", "Knit cotton dress"],
  ],
  jacket: [
    ["620332", "Men's non-knit cotton jacket or blazer"],
    ["620333", "Men's non-knit jacket or blazer of synthetic fibres"],
    ["620432", "Women's non-knit cotton jacket or blazer"],
    ["620433", "Women's non-knit jacket or blazer of synthetic fibres"],
  ],
  skirt: [
    ["620452", "Non-knit cotton skirt"],
    ["620453", "Non-knit skirt of synthetic fibres"],
    ["620459", "Non-knit skirt of other textile materials"],
  ],
  trousers: [
    ["620342", "Men's non-knit cotton trousers or shorts"],
    ["620343", "Men's non-knit trousers or shorts of synthetic fibres"],
    ["620462", "Women's non-knit cotton trousers or shorts"],
    ["620463", "Women's non-knit trousers or shorts of synthetic fibres"],
  ],
  set: [
    ["620312", "Men's non-knit suit of synthetic fibres"],
    ["620319", "Men's non-knit suit of other textile materials"],
    ["620322", "Men's non-knit cotton ensemble"],
    ["620422", "Women's non-knit cotton ensemble"],
  ],
};
