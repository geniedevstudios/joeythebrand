"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AdminDropdownChevron } from "./AdminDropdownChevron";
import {
  adminDropdownTriggerClass,
  adminDropdownPanelBaseClass,
  adminDropdownOptionButtonClass,
} from "./adminFormClasses";

type Option = { value: string; label: string; alwaysVisible?: boolean };

type AdminStyledSelectProps = {
  name?: string;
  options: Option[];
  defaultValue?: string;
  value?: string;
  required?: boolean;
  /** e.g. `mt-1` to align with other fields */
  wrapperClassName?: string;
  /** `aria-labelledby` target id */
  labelledBy?: string;
  /** Called when the user picks a different option (not used with forms alone). */
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  searchPlaceholder?: string;
};

export default function AdminStyledSelect({
  name,
  options,
  defaultValue,
  value: controlledValue,
  required,
  wrapperClassName,
  labelledBy,
  onValueChange,
  disabled = false,
  searchPlaceholder,
}: AdminStyledSelectProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const listId = useId();
  /** Panel opens downward (default) or upward when there is more room above. */
  const [placement, setPlacement] = useState<"below" | "above">("below");
  const [menuTop, setMenuTop] = useState(0);
  const [menuBottom, setMenuBottom] = useState(0);
  const [menuLeft, setMenuLeft] = useState(0);
  const [menuWidth, setMenuWidth] = useState(0);
  const [menuMaxH, setMenuMaxH] = useState(320);

  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (defaultValue !== undefined && !isControlled) {
      setInternalValue(defaultValue);
    }
  }, [defaultValue, isControlled]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const measure = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 6;
    const margin = 16;
    const maxPreferred = 320;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;

    const spaceBelow = vh - r.bottom - gap - margin;
    const spaceAbove = r.top - gap - margin;

    setMenuLeft(r.left);
    setMenuWidth(r.width);

    const openBelow = spaceBelow >= spaceAbove;
    if (openBelow) {
      setPlacement("below");
      setMenuTop(r.bottom + gap);
      setMenuMaxH(Math.max(120, Math.min(maxPreferred, spaceBelow)));
    } else {
      setPlacement("above");
      setMenuBottom(vh - r.top + gap);
      setMenuMaxH(Math.max(120, Math.min(maxPreferred, spaceAbove)));
    }
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    const onScroll = () => measure();
    const onResize = () => measure();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    const ro = rootRef.current ? new ResizeObserver(() => measure()) : null;
    if (rootRef.current) ro?.observe(rootRef.current);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (menuRef.current?.contains(document.activeElement)) triggerRef.current?.focus();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;
  const query = search.trim().toLowerCase();
  const visibleOptions = searchPlaceholder && query
    ? options.filter((option) => option.alwaysVisible || `${option.value} ${option.label}`.toLowerCase().includes(query))
    : options;

  function openMenu() {
    setSearch("");
    setOpen(true);
  }

  const panel =
    open &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        ref={menuRef}
        className={`${adminDropdownPanelBaseClass} fixed z-[300]`}
        style={{
          left: menuLeft,
          width: menuWidth,
          maxHeight: menuMaxH,
          overflowY: "auto",
          ...(placement === "above"
            ? { bottom: menuBottom, top: "auto" as const }
            : { top: menuTop, bottom: "auto" as const }),
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          const buttons = Array.from(menuRef.current?.querySelectorAll("button") ?? []);
          const current = buttons.findIndex((button) => button === document.activeElement);
          const next = event.key === "ArrowDown" ? buttons[current + 1] : buttons[current - 1];
          event.preventDefault();
          if (next) next.focus();
          else if (event.key === "ArrowUp" && current === 0) searchRef.current?.focus();
        }}
      >
        {searchPlaceholder && (
          <div className="sticky top-0 bg-white px-2 pb-1 pt-1">
            <input
              ref={searchRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label={searchPlaceholder}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-[#b6b7ba]/80 px-3 py-2 text-sm text-[#1c1e22] focus-visible:outline focus-visible:outline-[#b6b7ba]"
            />
          </div>
        )}
        <ul id={listId} role="listbox" aria-labelledby={labelledBy}>
          {visibleOptions.map((opt) => {
            const isActive = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  className={adminDropdownOptionButtonClass(isActive)}
                  onClick={() => {
                    setOpen(false);
                    triggerRef.current?.focus();
                    if (isActive) return;
                    if (!isControlled) setInternalValue(opt.value);
                    onValueChange?.(opt.value);
                  }}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
        {visibleOptions.length === 0 && <p role="status" className="px-3.5 py-2.5 text-sm text-zinc-600">No matching options</p>}
      </div>,
      rootRef.current?.closest("dialog[open]") ?? document.body,
    );

  return (
    <div className={["relative", wrapperClassName].filter(Boolean).join(" ")} ref={rootRef}>
      <input type="hidden" name={name} value={value} required={required} />
      <button
        ref={triggerRef}
        type="button"
        className={`${adminDropdownTriggerClass} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          if (open) setOpen(false);
          else openMenu();
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown") return;
          event.preventDefault();
          if (!open) {
            openMenu();
            if (!searchPlaceholder) requestAnimationFrame(() => menuRef.current?.querySelector("button")?.focus());
          } else {
            (searchRef.current ?? menuRef.current?.querySelector("button"))?.focus();
          }
        }}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        aria-expanded={open}
        {...(labelledBy ? { "aria-labelledby": `${labelledBy} ${listId}-value` } : {})}
      >
        <span id={`${listId}-value`} className="min-w-0 truncate text-left">{selectedLabel}</span>
        <AdminDropdownChevron open={open} />
      </button>
      {panel}
    </div>
  );
}
