import { DHL_LINE_WEIGHT_MODE, DHL_WEIGHT_TOLERANCE_KG } from "./dhlRules";

type LineWeight = { quantity: number; weightKg: number; grossWeightKg?: number };
const grams = (kg: number) => Math.round(kg * 1000);
const isGramWeight = (kg: number) => Number.isFinite(kg) && kg > 0
  && Number.isSafeInteger(grams(kg)) && Math.abs(kg * 1000 - grams(kg)) < 0.000001;

export function mapDhlLineWeights(line: LineWeight) {
  const factor = DHL_LINE_WEIGHT_MODE === "per_line" ? line.quantity : 1;
  return { netValue: grams(line.weightKg) * factor / 1000, grossValue: grams(line.grossWeightKg ?? line.weightKg) * factor / 1000 };
}

export function shipmentWeightTotals(lines: LineWeight[]) {
  let net = 0;
  let gross = 0;
  for (const line of lines) {
    const wire = mapDhlLineWeights(line);
    const factor = DHL_LINE_WEIGHT_MODE === "per_unit" ? line.quantity : 1;
    net += grams(wire.netValue) * factor;
    gross += grams(wire.grossValue) * factor;
  }
  return { netKg: net / 1000, grossKg: gross / 1000 };
}

export function validatePackedWeights(packedKg: number, lines: LineWeight[]) {
  if (!isGramWeight(packedKg) || lines.some((line) => !Number.isSafeInteger(line.quantity) || line.quantity < 1
      || !isGramWeight(line.weightKg) || !isGramWeight(line.grossWeightKg ?? line.weightKg))) {
    return "Use positive customs weights measured to the nearest gram and whole quantities.";
  }
  if (lines.some((line) => (line.grossWeightKg ?? line.weightKg) < line.weightKg)) return "Gross weight must be at least the garment net weight.";
  if (Math.abs(grams(packedKg) - grams(shipmentWeightTotals(lines).grossKg)) > grams(DHL_WEIGHT_TOLERANCE_KG)) {
    return "Total customs gross weight must match the sealed parcel weight within 0.001 kg.";
  }
  return null;
}

export function hasUnconfirmedQuantityWeights(lines: LineWeight[]) {
  return lines.some(({ quantity }) => quantity > 1);
}

export function allocateCartonWeight(packedKg: number, lines: LineWeight[]): (number | undefined)[] {
  const overrides = lines.map((line) => line.grossWeightKg);
  if (!isGramWeight(packedKg) || lines.some((line) => !isGramWeight(line.weightKg) || !Number.isSafeInteger(line.quantity) || line.quantity <= 0)) {
    return overrides;
  }

  const base = lines.map((line) => grams(line.grossWeightKg ?? line.weightKg) * line.quantity);
  const carton = grams(packedKg) - base.reduce((sum, value) => sum + value, 0);
  const adjustable = lines.flatMap((line, index) => line.grossWeightKg === undefined ? [index] : []);
  const net = adjustable.reduce((sum, index) => sum + base[index], 0);
  if (carton < 0 || net <= 0) return overrides;

  const shares = adjustable.map((index) => {
    const ideal = carton * base[index] / net;
    const floor = Math.floor(ideal);
    return { index, floor, remainder: ideal - floor };
  }).sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  const remaining = carton - shares.reduce((sum, share) => sum + share.floor, 0);
  for (const [rank, { index, floor }] of shares.entries()) {
    const extended = base[index] + floor + Number(rank < remaining);
    overrides[index] = Math.round(extended / lines[index].quantity) / 1000;
  }
  return overrides;
}
