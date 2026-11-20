"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import styles from "./SizePicker.module.css";

type SizePickerProps = {
  sizes: string[];
  selected: string;
  /** Called with the chosen size. */
  onChange: (size: string) => void;
  /** Display text for a size, e.g. UK/alpha aliases. */
  formatLabel: (size: string) => string;
  isSoldOut?: (size: string) => boolean;
  /** Accessible name for the dropdown. */
  ariaLabel?: string;
};

const LIST_MAX_HEIGHT = 248;

/** Custom size dropdown shared by the product page and every quick view. */
export default function SizePicker({
  sizes,
  selected,
  onChange,
  formatLabel,
  isSoldOut,
  ariaLabel = "Select size",
}: SizePickerProps) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const disabledAt = useCallback((i: number) => isSoldOut?.(sizes[i]) ?? false, [isSoldOut, sizes]);

  const step = useCallback(
    (from: number, dir: 1 | -1) => {
      for (let i = from + dir; i >= 0 && i < sizes.length; i += dir) {
        if (!disabledAt(i)) return i;
      }
      return from;
    },
    [sizes.length, disabledAt],
  );

  const openList = () => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) {
      const below = window.innerHeight - rect.bottom;
      setOpenUp(below < LIST_MAX_HEIGHT && rect.top > below);
    }
    const current = sizes.indexOf(selected);
    setActive(current >= 0 ? current : step(-1, 1));
    setOpen(true);
  };

  const choose = (size: string) => {
    onChange(size);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => step(i, 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => step(i, -1));
        break;
      case "Home":
        e.preventDefault();
        setActive(step(-1, 1));
        break;
      case "End":
        e.preventDefault();
        setActive(step(sizes.length, -1));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (active >= 0 && !disabledAt(active)) choose(sizes[active]);
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={`${styles.trigger} ${selected ? styles.hasValue : ""} ${open ? styles.isOpen : ""}`}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
      >
        <span className={styles.value}>{selected ? formatLabel(selected) : "Select size"}</span>
        <ChevronDown className={styles.chevron} size={16} strokeWidth={1.5} aria-hidden />
      </button>

      {open && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          className={`${styles.list} ${openUp ? styles.up : ""}`}
          style={{ maxHeight: LIST_MAX_HEIGHT }}
        >
          {sizes.map((size, i) => {
            const soldOut = disabledAt(i);
            const isSelected = size === selected;
            return (
              <li
                key={size}
                role="option"
                aria-selected={isSelected}
                aria-disabled={soldOut || undefined}
                className={`${styles.option} ${isSelected ? styles.selected : ""} ${
                  i === active ? styles.active : ""
                } ${soldOut ? styles.soldOut : ""}`}
                onPointerEnter={() => !soldOut && setActive(i)}
                onClick={() => !soldOut && choose(size)}
              >
                <span>{formatLabel(size)}</span>
                {soldOut ? (
                  <span className={styles.note}>Sold out</span>
                ) : isSelected ? (
                  <Check size={15} strokeWidth={1.75} aria-hidden />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
