function ordinalSuffix(day: number): string {
  const j = day % 10;
  const k = day % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}

/** e.g. "24th April 2026 · 11:20pm" (local timezone) */
export function formatOrderPlacedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  const day = d.getDate();
  const month = d.toLocaleString("en-GB", { month: "long" });
  const year = d.getFullYear();
  const datePart = `${day}${ordinalSuffix(day)} ${month} ${year}`;

  let h24 = d.getHours();
  const mins = d.getMinutes();
  const ampm = h24 >= 12 ? "pm" : "am";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  const timePart = `${h12}:${mins.toString().padStart(2, "0")}${ampm}`;

  return `${datePart} · ${timePart}`;
}
