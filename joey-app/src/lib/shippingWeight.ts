type Dimensions = { length: number; width: number; height: number };

type PackagingProfile = {
  emptyWeightKg: number;
  maxGarmentWeightKg: number;
  dimensions: Dimensions;
};

const defaultPackaging: PackagingProfile = {
  emptyWeightKg: 0.2,
  maxGarmentWeightKg: Infinity,
  dimensions: { length: 30, width: 20, height: 10 },
};

export function garmentWeightKg(value: unknown) {
  const weight = typeof value === "number" || typeof value === "string" ? Number(value) : 0;
  return Number.isFinite(weight) && weight > 0 ? weight : 0.5;
}

function validProfile(value: unknown): value is PackagingProfile {
  const box = value as PackagingProfile | null;
  return !!box?.dimensions &&
    [box.emptyWeightKg, box.maxGarmentWeightKg, box.dimensions.length, box.dimensions.width, box.dimensions.height]
      .every((number) => typeof number === "number" && Number.isFinite(number) && number > 0);
}

export function estimateShippingParcel(garmentWeight: number, suppliedDimensions?: Dimensions) {
  if (!Number.isFinite(garmentWeight) || garmentWeight <= 0) throw new Error("Invalid garment weight for DHL quote.");
  const configured = process.env.DHL_PACKAGING_PROFILES?.trim();
  let profiles = [defaultPackaging];
  if (configured) {
    const parsed: unknown = JSON.parse(configured);
    if (!Array.isArray(parsed) || !parsed.length || !parsed.every(validProfile)) {
      throw new Error("DHL packaging profiles are invalid.");
    }
    profiles = parsed.sort((a, b) => a.maxGarmentWeightKg - b.maxGarmentWeightKg);
  }
  const packaging = profiles.find((box) => garmentWeight <= box.maxGarmentWeightKg);
  if (!packaging) throw new Error("DHL needs a custom quote for this parcel size.");
  return {
    weight: Math.max(0.5, Math.ceil((garmentWeight + packaging.emptyWeightKg - 1e-10) * 1000) / 1000),
    dimensions: suppliedDimensions || packaging.dimensions,
  };
}
