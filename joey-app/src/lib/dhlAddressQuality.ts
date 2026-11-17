import { DHL_ADDRESS_MIN_WORDS, DHL_GHANA_POST_GPS } from "./dhlRules";

export function findGhanaPostGps(value?: string) {
  return value?.match(DHL_GHANA_POST_GPS)?.[0].toUpperCase();
}

export function qualifiesDhlStreet(street: string, country: string, postal?: string) {
  if (country.toUpperCase() === "GH" && (findGhanaPostGps(street) || findGhanaPostGps(postal))) return true;
  return new Set(street.toLowerCase().match(/\p{L}[\p{L}\p{N}]*/gu) ?? []).size >= DHL_ADDRESS_MIN_WORDS;
}
