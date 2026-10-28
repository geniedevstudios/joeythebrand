export const ACCRA_TIMEZONE = "Africa/Accra";

/**
 * Converts a date (YYYY-MM-DD) and time (HH:mm or HH:mm:ss) in Africa/Accra (GMT / +00:00)
 * into a canonical UTC ISO 8601 string.
 */
export function accraDateAndTimeToIso(dateYmd: string, timeHm: string): string | null {
  const d = String(dateYmd || "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const tRaw = String(timeHm || "").trim();
  const m = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(tRaw);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  const ss = m[3] ? Number(m[3]) : 0;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59 || ss < 0 || ss > 59) return null;
  const isoInput = `${d}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}.000Z`;
  const parsed = new Date(isoInput);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

/** Extracts YYYY-MM-DD and HH:mm in Africa/Accra from an ISO timestamp. */
export function isoToAccraDateAndTime(iso?: string | null): { date: string; time: string } | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso.trim());
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ACCRA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour") === "24" ? "00" : get("hour");
  const minute = get("minute");
  if (!year || !month || !day) return null;
  return {
    date: `${year}-${month}-${day}`,
    time: `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`,
  };
}

/** Long date + time with 12-hour clock (am/pm) in Africa/Accra for account, emails, and print slip. */
export function formatConsultationAppointmentLocal(iso?: string | null): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso.trim());
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleString("en-US", {
    timeZone: ACCRA_TIMEZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })} (GMT)`;
}

/** Formats a date (YYYY-MM-DD or ISO) and optional 24h time (HH:mm) consistently in Africa/Accra. */
export function formatPreferredSlotAccra(dateIso?: string | null, time24?: string | null): string {
  if (!dateIso?.trim() || dateIso.trim() === "—") return "—";
  const raw = dateIso.trim();
  const d = new Date(raw.length === 10 ? `${raw}T12:00:00Z` : raw);
  const dateLabel = Number.isNaN(d.getTime())
    ? raw
    : d.toLocaleDateString("en-US", {
        timeZone: ACCRA_TIMEZONE,
        year: "numeric",
        month: "long",
        day: "numeric",
      });
  if (!time24?.trim()) return dateLabel;
  const time = time24.trim();
  const m = /^(\d{2}):(\d{2})$/.exec(time);
  if (!m) return `${dateLabel} • ${time} (GMT)`;
  const h = Number(m[1]);
  const mm = m[2];
  const hour12 = ((h + 11) % 12) + 1;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${dateLabel} • ${hour12}:${mm} ${ampm} (GMT)`;
}
