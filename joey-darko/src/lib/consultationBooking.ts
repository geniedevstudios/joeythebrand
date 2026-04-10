import { supabase } from "@/lib/supabase";

/**
 * Calendar for the portfolio site (no sign-in). Requires
 * `consultation_availability_public` from `supabase_consultation_portfolio.sql`.
 */
export async function getPublicConsultationAvailability(): Promise<{
  maxSlotsPerDay: number;
  disabledDateSet: Set<string>;
}> {
  const { data, error } = await supabase.rpc("consultation_availability_public", {
    p_days_ahead: 365,
  });
  if (error) throw new Error(error.message);

  const raw = data as {
    maxSlotsPerDay?: number;
    userBlockedDates?: unknown;
    atCapacityDates?: unknown;
  };

  const parseDateArray = (x: unknown): string[] => {
    if (!Array.isArray(x)) return [];
    return x
      .map((v) =>
        typeof v === "string" ? v.replace(/^"|"$/g, "").slice(0, 10) : String(v).replace(/^"|"$/g, "").slice(0, 10),
      )
      .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s));
  };

  const merged = new Set([...parseDateArray(raw.userBlockedDates), ...parseDateArray(raw.atCapacityDates)]);

  const maxSlots = Number(raw.maxSlotsPerDay);
  return {
    maxSlotsPerDay: Number.isFinite(maxSlots) && maxSlots >= 1 ? maxSlots : 5,
    disabledDateSet: merged,
  };
}
