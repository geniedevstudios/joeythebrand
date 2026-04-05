/** Custom dropdown trigger (buttons that open a list), e.g. hero fit / anchor. */
export const adminDropdownTriggerClass =
  "flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200/90 bg-gradient-to-b from-stone-50 to-zinc-100/95 px-3.5 py-2.5 text-left text-sm font-medium text-zinc-800 shadow-sm outline-none transition " +
  "hover:border-zinc-300 hover:from-stone-50 hover:to-zinc-50 " +
  "focus-visible:border-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-300/50 " +
  "active:scale-[0.995]";

/** Options panel (shared with Site Content hero dropdowns). */
export const adminDropdownPanelBaseClass =
  "overflow-hidden rounded-xl border border-zinc-200/95 bg-gradient-to-b from-white to-stone-50/95 py-1 shadow-xl shadow-zinc-900/10 ring-1 ring-black/5";

/** Panel anchored under inline trigger (e.g. hero fit on Content page). */
export const adminDropdownPanelInlineClass =
  `${adminDropdownPanelBaseClass} absolute left-0 right-0 top-full z-[100] mt-1.5`;

export function adminDropdownOptionButtonClass(isActive: boolean): string {
  return (
    "flex w-full items-center px-3.5 py-2.5 text-left text-sm transition " +
    (isActive
      ? "bg-zinc-200/80 font-semibold text-zinc-900"
      : "text-zinc-700 hover:bg-zinc-100/90 hover:text-zinc-950")
  );
}
