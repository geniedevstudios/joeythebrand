/** Shared light-admin chrome (cream #f5f1eb + gray #b6b7ba). */

export const ADMIN_CREAM = "#f5f1eb";
export const ADMIN_GRAY = "#b6b7ba";
export const ADMIN_INK = "#1c1e22";

/** Pill tab track (nav / page section tabs). */
export const adminPillTrackClass =
  "inline-flex w-max max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-[#b6b7ba]/80 bg-[#b6b7ba]/40 p-1";

export function adminPillClass(active: boolean, size: "sm" | "md" = "md"): string {
  const pad =
    size === "sm"
      ? "px-3.5 py-2 text-[10px] uppercase tracking-[0.12em]"
      : "px-4 py-2.5 text-[11px] tracking-wide";
  return `whitespace-nowrap rounded-full font-semibold transition ${pad} ${
    active
      ? "bg-[#1c1e22] text-[#f5f1eb] shadow-sm"
      : "text-[#1c1e22]/70 hover:bg-white/80 hover:text-[#1c1e22]"
  }`;
}
