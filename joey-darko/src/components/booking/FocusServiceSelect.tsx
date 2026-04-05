"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./focusServiceSelect.module.css";

type Props = {
  id: string;
  name: string;
  value: string;
  options: readonly string[];
  placeholder?: string;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onChange: (e: { target: { name: string; value: string } }) => void;
};

type Rect = { top: number; left: number; width: number };

export default function FocusServiceSelect({
  id,
  name,
  value,
  options,
  placeholder = "Choose a focus area…",
  menuOpen: isOpen,
  onMenuOpenChange: setIsOpen,
  onChange,
}: Props) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [menuRect, setMenuRect] = useState<Rect | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const selectedLabel = value ? options.find((o) => o === value) || value : "";

  const updateMenuPosition = () => {
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setMenuRect({ top: r.bottom + 6, left: r.left, width: r.width });
  };

  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuRect(null);
      return;
    }
    updateMenuPosition();
    window.addEventListener("scroll", updateMenuPosition, true);
    window.addEventListener("resize", updateMenuPosition);
    return () => {
      window.removeEventListener("scroll", updateMenuPosition, true);
      window.removeEventListener("resize", updateMenuPosition);
    };
  }, [isOpen]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (containerRef.current?.contains(t)) return;
      if (listRef.current?.contains(t)) return;
      setIsOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [setIsOpen]);

  useEffect(() => {
    if (isOpen) {
      const i = Math.max(0, options.findIndex((o) => o === value));
      setHighlightedIndex(value ? i : 0);
      requestAnimationFrame(() => listRef.current?.focus());
    }
  }, [isOpen, options, value]);

  useEffect(() => {
    if (!isOpen) return;
    optionRefs.current[highlightedIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [highlightedIndex, isOpen]);

  const pick = (opt: string) => {
    onChange({ target: { name, value: opt } });
    setIsOpen(false);
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen(!isOpen);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      else setHighlightedIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      else setHighlightedIndex((i) => Math.max(i - 1, 0));
    }
  };

  const onListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const opt = options[highlightedIndex];
      if (opt) pick(opt);
    }
  };

  const list =
    isOpen && menuRect ? (
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        tabIndex={0}
        className={styles.listPortal}
        style={{
          position: "fixed",
          top: menuRect.top,
          left: menuRect.left,
          width: menuRect.width,
          zIndex: 9999,
        }}
        aria-labelledby={id}
        aria-activedescendant={`${id}-opt-${highlightedIndex}`}
        onKeyDown={onListKeyDown}
      >
        {options.map((opt, index) => {
          const selected = opt === value;
          const highlight = index === highlightedIndex;
          return (
            <li key={opt} role="presentation">
              <button
                ref={(el) => {
                  optionRefs.current[index] = el;
                }}
                type="button"
                id={`${id}-opt-${index}`}
                role="option"
                aria-selected={selected}
                tabIndex={-1}
                className={`${styles.option} ${highlight ? styles.optionHighlight : ""} ${selected ? styles.optionSelected : ""}`}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => pick(opt)}
              >
                {opt}
              </button>
            </li>
          );
        })}
      </ul>
    ) : null;

  return (
    <div ref={containerRef} className={styles.root}>
      <button
        type="button"
        id={id}
        className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ""} ${!selectedLabel ? styles.triggerPlaceholder : ""}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={onTriggerKeyDown}
      >
        <span>{selectedLabel || placeholder}</span>
        <span className={`${styles.chevron} ${isOpen ? styles.chevronUp : ""}`} aria-hidden />
      </button>

      {typeof document !== "undefined" && list ? createPortal(list, document.body) : null}
    </div>
  );
}
