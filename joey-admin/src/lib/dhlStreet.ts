import { DHL_ADDRESS_LINE_MAX, DHL_ADDRESS_MIN_WORDS, DHL_GHANA_POST_GPS, DHL_SEND_GPS_IN_ADDRESS_LINE } from "./dhlRules";

type Street = { addressLine1: string; countryCode: string; postalCode?: string };
const overflow = "The DHL address does not fit in three 45-character lines. Shorten the street or landmark.";

function findGhanaPostGps(value?: string) {
  return value?.match(DHL_GHANA_POST_GPS)?.[0].toUpperCase();
}

function qualifiesDhlStreet(street: string, country: string, postal?: string) {
  if (country.toUpperCase() === "GH" && (findGhanaPostGps(street) || findGhanaPostGps(postal))) return true;
  return new Set(street.toLowerCase().match(/\p{L}[\p{L}\p{N}]*/gu) ?? []).size >= DHL_ADDRESS_MIN_WORDS;
}

export function wrapDhlStreet(address: Street) {
  let street = address.addressLine1.trim();
  const gps = address.countryCode.toUpperCase() === "GH" && DHL_SEND_GPS_IN_ADDRESS_LINE
    ? findGhanaPostGps(street) ?? findGhanaPostGps(address.postalCode) : undefined;
  if (gps) street = street.replace(new RegExp("(?:\\bGhanaPost\\s+GPS\\s+)?\\b" + gps + "\\b", "gi"), "").replace(/[,\s]+$/, "").trim();

  const lines: string[] = [];
  let current = "";
  for (const word of street.split(/\s+/).filter(Boolean)) {
    if (word.length > DHL_ADDRESS_LINE_MAX) throw new Error(overflow);
    const candidate = current ? current + " " + word : word;
    if (candidate.length > DHL_ADDRESS_LINE_MAX) {
      lines.push(current);
      current = word;
    } else current = candidate;
  }
  if (current) lines.push(current);
  if (gps) lines.push("GhanaPost GPS " + gps);
  if (lines.length > 3) throw new Error(overflow);
  if (!lines.length) throw new Error("Enter a DHL street address.");
  return {
    addressLine1: lines[0],
    ...(lines[1] && { addressLine2: lines[1] }),
    ...(lines[2] && { addressLine3: lines[2] }),
  };
}

export function validateDhlStreet(address: Street) {
  if (!qualifiesDhlStreet(address.addressLine1, address.countryCode, address.postalCode)) {
    return "For DHL, enter a street, building or landmark with at least two words, or a valid GhanaPost GPS code.";
  }
  try {
    wrapDhlStreet(address);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : overflow;
  }
}
