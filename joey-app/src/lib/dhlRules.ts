// Source: GhanaPost GPS format specified in the Phase 1 brief.
export const DHL_GHANA_POST_GPS = /\b[A-Z]{2}-\d{3}-\d{4}\b/i;
// Source: Joey policy; reject unqualified DHL delivery addresses.
export const DHL_ADDRESS_MIN_WORDS = 2;

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
