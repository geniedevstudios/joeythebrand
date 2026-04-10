export const BOOKING_HISTORY_KEY = "joeyydarko_bookings";

export function getBookingTokens(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BOOKING_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch (err) {
    console.error("Failed to parse booking history", err);
  }
  return [];
}

export function saveBookingToken(token: string) {
  if (typeof window === "undefined") return;
  const current = getBookingTokens();
  if (!current.includes(token)) {
    const updated = [token, ...current];
    window.localStorage.setItem(BOOKING_HISTORY_KEY, JSON.stringify(updated));
    // Emit an event so tabs can update if open
    window.dispatchEvent(new Event("joeyydarko-history-updated"));
  }
}
