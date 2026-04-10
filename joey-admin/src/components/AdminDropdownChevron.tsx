"use client";

export function AdminDropdownChevron({ open }: { open: boolean }) {
  return (
    <span
      className={`shrink-0 text-zinc-700 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </span>
  );
}
