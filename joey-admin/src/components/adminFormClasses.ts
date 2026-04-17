/** Custom dropdown trigger (buttons that open a list), e.g. hero fit / anchor. */
export const adminDropdownTriggerClass =
  "flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-left text-sm font-semibold text-white/90 shadow-[0_18px_70px_rgba(0,0,0,0.35)] outline-none backdrop-blur-md transition " +
  "hover:bg-white/[0.07] hover:border-[#d6ff2a]/25 " +
  "focus-visible:border-[#d6ff2a]/50 focus-visible:ring-2 focus-visible:ring-[#d6ff2a]/20 " +
  "active:scale-[0.995]";

/** Options panel (shared with Site Content hero dropdowns). */
export const adminDropdownPanelBaseClass =
  "overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d10]/90 py-1 shadow-[0_26px_90px_rgba(0,0,0,0.55)] ring-1 ring-white/5 backdrop-blur-xl";

/** Panel anchored under inline trigger (e.g. hero fit on Content page). */
export const adminDropdownPanelInlineClass =
  `${adminDropdownPanelBaseClass} absolute left-0 right-0 top-full z-[100] mt-1.5`;

export function adminDropdownOptionButtonClass(isActive: boolean): string {
  return (
    "flex w-full items-center px-3.5 py-2.5 text-left text-sm font-semibold transition " +
    (isActive
      ? "bg-white/10 text-white"
      : "text-white/75 hover:bg-white/5 hover:text-white")
  );
}
