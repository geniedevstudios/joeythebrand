/**
 * ISO 3166-1 alpha-2 list from
 * https://github.com/lukes/ISO-3166-Countries-with-Regional-Codes (slim-2, names + alpha-2).
 */
import countriesJson from "@/data/countries-iso3166-slim2.json";

type CountryRow = { name: string; "alpha-2": string };

export type CountrySelectOption = {
  value: string;
  label: string;
  /** ISO2 for PNG flags (CustomSelect `flagIso2`) — works on Windows; emoji often does not */
  flagIso2: string;
};

const rows = countriesJson as CountryRow[];

export const COUNTRY_SELECT_OPTIONS: CountrySelectOption[] = rows
  .filter((r) => typeof r["alpha-2"] === "string" && r["alpha-2"].length === 2)
  .map((r) => {
    const code = r["alpha-2"].toUpperCase();
    return {
      value: code,
      label: r.name,
      flagIso2: code,
    };
  })
  .sort((a, b) => a.label.localeCompare(b.label, "en"));

/**
 * Countries for “Outside Ghana” checkout only. Ghana is omitted so domestic
 * orders use “Within Ghana” + region list; avoids duplicate/confusing paths.
 */
export const INTERNATIONAL_CHECKOUT_COUNTRY_OPTIONS: CountrySelectOption[] = COUNTRY_SELECT_OPTIONS.filter(
  (c) => c.value !== "GH",
);

const nameByCode = new Map(COUNTRY_SELECT_OPTIONS.map((c) => [c.value, c.label]));

export function countryNameFromIso2(code: string): string {
  if (!code.trim()) return "";
  return nameByCode.get(code.toUpperCase()) ?? code;
}
