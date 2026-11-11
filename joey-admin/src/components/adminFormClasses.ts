/** Custom dropdown trigger (buttons that open a list), e.g. hero fit / anchor. */
export const adminDropdownTriggerClass =
  "flex w-full items-center justify-between gap-3 rounded-2xl border border-[#b6b7ba]/80 bg-white px-3.5 py-2.5 text-left text-sm font-semibold text-[#1c1e22] shadow-sm outline-none transition " +
  "hover:bg-[#f5f1eb] hover:border-[#1c1e22]/25 " +
  "focus-visible:border-[#1c1e22]/45 focus-visible:ring-2 focus-visible:ring-[#b6b7ba]/60 " +
  "active:scale-[0.995]";

/** Options panel (shared with Site Content hero dropdowns). */
export const adminDropdownPanelBaseClass =
  "overflow-hidden rounded-2xl border border-[#b6b7ba]/80 bg-white py-1 shadow-[0_18px_50px_rgba(28,30,34,0.14)] ring-1 ring-black/5";

/** Panel anchored under inline trigger (e.g. hero fit on Content page). */
export const adminDropdownPanelInlineClass =
  `${adminDropdownPanelBaseClass} absolute left-0 right-0 top-full z-[100] mt-1.5`;

export function adminDropdownOptionButtonClass(isActive: boolean): string {
  return (
    "flex w-full items-center px-3.5 py-2.5 text-left text-sm font-semibold transition " +
    (isActive
      ? "bg-[#1c1e22] text-[#f5f1eb]"
      : "text-[#1c1e22]/75 hover:bg-[#f5f1eb] hover:text-[#1c1e22]")
  );
}
