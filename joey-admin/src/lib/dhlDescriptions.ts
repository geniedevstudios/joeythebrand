import { GENERIC_CUSTOMS_DESCRIPTION, INTENDED_WEARERS, type CustomsComponent } from "./customsProfile";
import {
  DHL_CUSTOMS_DESCRIPTION_MAX, DHL_CUSTOMS_DESCRIPTION_MIN, DHL_CUSTOMS_DESCRIPTION_MIN_WORDS,
  DHL_DOMESTIC_DESCRIPTION_MIN, DHL_DOMESTIC_DESCRIPTION_MIN_WORDS, DHL_SHIPMENT_DESCRIPTION_MAX,
} from "./dhlRules";

const words = (value: string) => value.toLowerCase().match(/\p{L}[\p{L}\p{N}]*/gu) ?? [];

export function prefillCustomsDescription(component: CustomsComponent) {
  return [component.description, component.fibres, component.construction,
    component.intendedWearer && "for " + component.intendedWearer, "made in Ghana"]
    .map((part) => part?.trim()).filter(Boolean).join(", ");
}

export function validateCustomsDescription(raw: unknown, productName?: string, wearer?: CustomsComponent["intendedWearer"]) {
  if (!wearer || !INTENDED_WEARERS.includes(wearer)) return "Set the intended wearer in Products before booking.";
  const value = typeof raw === "string" ? raw.trim() : "";
  const tokens = words(value);
  if (value.length < DHL_CUSTOMS_DESCRIPTION_MIN || value.length > DHL_CUSTOMS_DESCRIPTION_MAX) {
    return "Enter a customs description of " + DHL_CUSTOMS_DESCRIPTION_MIN + "–" + DHL_CUSTOMS_DESCRIPTION_MAX + " characters.";
  }
  if (GENERIC_CUSTOMS_DESCRIPTION.test(value)) return "Replace the generic description with details about the garment.";
  if (productName && tokens.join(" ") === words(productName).join(" ")) return "Describe the garment rather than using its product name alone.";
  if (new Set(tokens).size < DHL_CUSTOMS_DESCRIPTION_MIN_WORDS) return "Use at least " + DHL_CUSTOMS_DESCRIPTION_MIN_WORDS + " distinct words.";
  if (tokens.some((word, index) => index > 1 && tokens[index - 1] === word && tokens[index - 2] === word)) {
    return "Remove repeated filler from the customs description.";
  }
  return null;
}

export function validateShipmentDescription(raw: unknown, domestic: boolean) {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return "Enter a shipment description.";
  if (value.length > DHL_SHIPMENT_DESCRIPTION_MAX) return "Shipment description must not exceed " + DHL_SHIPMENT_DESCRIPTION_MAX + " characters.";
  if (domestic && (value.length < DHL_DOMESTIC_DESCRIPTION_MIN || new Set(words(value)).size < DHL_DOMESTIC_DESCRIPTION_MIN_WORDS)) {
    return "Describe what is in the parcel using at least " + DHL_DOMESTIC_DESCRIPTION_MIN + " characters and " + DHL_DOMESTIC_DESCRIPTION_MIN_WORDS + " words.";
  }
  return null;
}
