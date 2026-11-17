// Source: DHL sample (limits shown in the collection).
export const DHL_CUSTOMS_DESCRIPTION_MAX = 512;
export const DHL_SHIPMENT_DESCRIPTION_MAX = 70;
export const DHL_REFERENCE_MAX = 35;
export const DHL_ADDRESS_LINE_MAX = 45;

// Source: GhanaPost GPS format specified in the Phase 1 brief.
export const DHL_GHANA_POST_GPS = /\b[A-Z]{2}-\d{3}-\d{4}\b/i;

// Source: Joey policy.
export const DHL_ADDRESS_MIN_WORDS = 2;
export const DHL_CUSTOMS_DESCRIPTION_MIN = 40;
export const DHL_CUSTOMS_DESCRIPTION_MIN_WORDS = 6;
export const DHL_DOMESTIC_DESCRIPTION_MIN = 12;
export const DHL_DOMESTIC_DESCRIPTION_MIN_WORDS = 2;
export const DHL_WEIGHT_TOLERANCE_KG = 0.001;

// Source: pending DHL confirmation; the supplied sample sends both directions.
export const DHL_HS_MIN_DIGITS = 6;
export const DHL_REQUIRE_INBOUND_HS: boolean = true;
// Source: pending DHL confirmation (sample only uses quantity 1).
export const DHL_LINE_WEIGHT_MODE = "per_unit" as "per_unit" | "per_line";
// Source: pending DHL confirmation on GhanaPost GPS.
export const DHL_SEND_GPS_IN_ADDRESS_LINE: boolean = true;
// Source: pending DHL confirmation on #INVPATTERN and Rates freight.
export const DHL_INVOICE_NUMBER_PREFIX = "INV-";
export const DHL_INVOICE_FREIGHT_SOURCE = "stored" as "stored" | "fresh";
// Source: DHL sample; private-recipient value pending DHL confirmation.
export const DHL_RECEIVER_PARTY_TYPE = "business";
// Source: approved Joey deviations pending DHL confirmation.
export const DHL_SEND_DOMESTIC_REFERENCE: boolean = true;
export const DHL_PICKUP_SEND_WAYBILL: boolean = true;
export const DHL_PICKUP_CLOSE_TIME = "16:00";
export const DHL_PICKUP_INSTRUCTION_TYPE_CODE = "TBD";

// Source: Joey environment safety policy.
export const DHL_TEST_API_BASE = "https://express.api.dhl.com/mydhlapi/test";
export type DhlEnvironment = "test" | "live";

export function resolveDhlEnvironment(base: string, env: NodeJS.ProcessEnv) {
  const value = env.DHL_ENVIRONMENT?.trim();
  const preview = env.VERCEL_ENV === "preview" || env.VERCEL_ENV === "development";
  const deployed = env.VERCEL_ENV === "production" || (!preview && env.NODE_ENV === "production");
  if ((!value && deployed) || (value && value !== "test" && value !== "live")) {
    throw new Error("Configure DHL_ENVIRONMENT as test or live.");
  }
  const environment: DhlEnvironment = value === "live" ? "live" : "test";
  if ((/\/test$/i.test(base) ? "test" : "live") !== environment) {
    throw new Error("DHL_ENVIRONMENT does not match DHL_API_BASE_URL.");
  }
  return { environment, explicit: Boolean(value) };
}

export function dhlEnvironmentMatches(stored: unknown, active: ReturnType<typeof resolveDhlEnvironment>) {
  return stored == null ? !active.explicit : stored === active.environment;
}

// Source: Joey sandbox demo setting. Live shipments always review freight.
export function shouldReviewDhlFreight(environment: DhlEnvironment) {
  return environment === "live" || process.env.DHL_DEMO_SKIP_FREIGHT_REVIEW !== "true";
}
