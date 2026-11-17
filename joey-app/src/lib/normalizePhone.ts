import { isSupportedCountry, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";

export function normalizePhone(raw: unknown, countryHint?: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  const country = typeof countryHint === "string" ? countryHint.toUpperCase() as CountryCode : undefined;
  if (!text.startsWith("+") && (!country || !isSupportedCountry(country))) return null;
  const phone = parsePhoneNumberFromString(text, { defaultCountry: country, extract: false });
  return phone?.isValid() && !phone.ext ? phone.number : null;
}
