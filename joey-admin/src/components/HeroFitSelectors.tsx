"use client";

import { useEffect, useRef, useState } from "react";
import type { PageHeroAnchor, PageHeroFit } from "@/lib/types";
import { AdminDropdownChevron } from "./AdminDropdownChevron";
import {
  adminDropdownTriggerClass,
  adminDropdownPanelInlineClass,
  adminDropdownOptionButtonClass,
} from "./adminFormClasses";

function StyledDropdown<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-700">{label}</span>
      <button
        type="button"
        className={`${adminDropdownTriggerClass} mt-1.5`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="min-w-0 truncate">{selectedLabel}</span>
        <AdminDropdownChevron open={open} />
      </button>

      {open && (
        <ul role="listbox" className={adminDropdownPanelInlineClass}>
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  className={adminDropdownOptionButtonClass(isActive)}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function HeroFitSelectors({
  fit,
  anchor,
  onFit,
  onAnchor,
  compact,
}: {
  fit: PageHeroFit;
  anchor: PageHeroAnchor;
  onFit: (f: PageHeroFit) => void;
  onAnchor: (a: PageHeroAnchor) => void;
  compact?: boolean;
}) {
  const gridClass = compact
    ? "mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2"
    : "mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2";

  const fitOptions: { value: PageHeroFit; label: string }[] = [
    { value: "cover", label: "Fill banner (may crop)" },
    { value: "contain", label: "Show full image (letterbox bars)" },
  ];

  const anchorOptions: { value: PageHeroAnchor; label: string }[] = [
    { value: "top", label: "Top" },
    { value: "center", label: "Center" },
    { value: "bottom", label: "Bottom" },
  ];

  return (
    <div className={gridClass}>
      <StyledDropdown label="Fill mode" value={fit} onChange={onFit} options={fitOptions} />
      <StyledDropdown label="Focus (when cropping)" value={anchor} onChange={onAnchor} options={anchorOptions} />
    </div>
  );
}
