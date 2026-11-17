"use client";
/* eslint-disable @next/next/no-img-element */
import { useState, useRef, useEffect } from "react";

export type CustomSelectOption = {
  value: string;
  label: string;
  /** Shown before the label (e.g. flag emoji); aria-hidden on the decorative span */
  prefix?: string;
  /**
   * When set, shows a PNG flag (reliable on Windows; emoji flags often don’t render).
   * ISO 3166-1 alpha-2, e.g. "US" — served from flagcdn.com.
   */
  flagIso2?: string;
};

type CustomSelectProps = {
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  required?: boolean;
  searchPlaceholder?: string;
  /** Max height of the options list in pixels (default 240) */
  listMaxHeight?: number;
};

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function optionDisplayText(opt: CustomSelectOption): string {
  return opt.prefix ? `${opt.prefix} ${opt.label}` : opt.label;
}

function OptionLeadingVisual({ opt }: { opt: CustomSelectOption }) {
  if (opt.flagIso2) {
    const code = opt.flagIso2.toLowerCase();
    return (
      <img
        src={`https://flagcdn.com/w40/${code}.png`}
        alt=""
        width={28}
        height={21}
        loading="lazy"
        decoding="async"
        style={{
          objectFit: "cover",
          borderRadius: 3,
          flexShrink: 0,
          boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.08)",
        }}
      />
    );
  }
  if (opt.prefix) {
    return (
      <span aria-hidden style={{ fontSize: "1.35rem", lineHeight: 1, flexShrink: 0 }}>
        {opt.prefix}
      </span>
    );
  }
  return null;
}

export default function CustomSelect({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = "Select an option",
  required = false,
  searchPlaceholder,
  listMaxHeight = 240,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(opt => opt.value === value);
  const search = normalizeSearch(query.trim());
  const visibleOptions = search
    ? options.filter((option) => normalizeSearch(option.label).includes(search) || option.value.toLowerCase() === search)
    : options;
  const activeOption = visibleOptions[highlightedIndex];
  const listId = `${id}-listbox`;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchPlaceholder) searchRef.current?.focus();
  }, [isOpen, searchPlaceholder]);

  function openSelect() {
    setQuery("");
    setHighlightedIndex(0);
    setIsOpen(true);
  }

  function closeAndFocusTrigger() {
    setIsOpen(false);
    if (searchPlaceholder) triggerRef.current?.focus();
  }

  function handleSelect(optionValue: string) {
    onChange({ target: { name, value: optionValue } } as React.ChangeEvent<HTMLSelectElement>);
    closeAndFocusTrigger();
  }

  function handleKeyDown(event: React.KeyboardEvent, searching = false) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter" || (!searching && event.key === " ")) {
      event.preventDefault();
      if (!isOpen) openSelect();
      else if (activeOption) handleSelect(activeOption.value);
    } else if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      event.stopPropagation();
      closeAndFocusTrigger();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        openSelect();
        return;
      }
      const next = Math.max(0, Math.min(highlightedIndex + (event.key === "ArrowDown" ? 1 : -1), visibleOptions.length - 1));
      setHighlightedIndex(next);
      document.getElementById(`${listId}-option-${next}`)?.scrollIntoView({ block: "nearest" });
    }
  }

  return (
    <div ref={containerRef} className="custom-select-container" style={{ position: "relative" }}
      onBlur={searchPlaceholder ? (event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
      } : undefined}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={`${id}-label`}
        aria-controls={isOpen ? listId : undefined}
        onClick={() => isOpen ? setIsOpen(false) : openSelect()}
        onKeyDown={(event) => handleKeyDown(event)}
        className="custom-select-trigger"
        style={{
          width: "100%",
          padding: "0.875rem 1rem",
          background: "rgba(255, 255, 255, 0.6)",
          backdropFilter: "blur(8px)",
          border: `1px solid ${isOpen ? "var(--blue-athracite)" : "var(--color-border)"}`,
          borderRadius: "var(--radius-md)",
          fontSize: "1rem",
          fontFamily: "var(--font-body)",
          color: selectedOption ? "var(--color-text-primary)" : "var(--cinereous)",
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          transition: "border-color var(--transition-fast), background var(--transition-fast)",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            minWidth: 0,
            flex: 1,
          }}
        >
          {selectedOption ? <OptionLeadingVisual opt={selectedOption} /> : null}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke={isOpen ? "var(--blue-athracite)" : "var(--alaska-gray)"} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          style={{ 
            transform: isOpen ? "rotate(180deg)" : "rotate(0)", 
            transition: "transform 0.2s ease" 
          }}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "4px",
            background: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
            zIndex: 100,
          }}
        >
          {searchPlaceholder && (
            <div style={{ padding: "0.5rem" }}>
              <input
                ref={searchRef}
                type="text"
                role="combobox"
                aria-label={searchPlaceholder}
                aria-autocomplete="list"
                aria-expanded
                aria-controls={listId}
                aria-activedescendant={activeOption ? `${listId}-option-${highlightedIndex}` : undefined}
                autoComplete="off"
                className="form-input"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setHighlightedIndex(0);
                  document.getElementById(listId)?.scrollTo(0, 0);
                }}
                onKeyDown={(event) => handleKeyDown(event, true)}
              />
            </div>
          )}
          <div role="listbox" id={listId} aria-labelledby={`${id}-label`}
            style={{ maxHeight: `${listMaxHeight}px`, overflowY: "auto", padding: "4px 0" }}
          >
            {visibleOptions.map((option, index) => (
              <div
                key={option.value}
                id={`${listId}-option-${index}`}
                role="option"
                aria-selected={value === option.value}
                onMouseDown={searchPlaceholder ? (event) => event.preventDefault() : undefined}
                onClick={() => handleSelect(option.value)}
                onMouseEnter={() => setHighlightedIndex(index)}
                style={{
                  padding: "0.75rem 1rem",
                  cursor: "pointer",
                  background: index === highlightedIndex ? "rgba(39, 43, 54, 0.06)" : "transparent",
                  color: value === option.value ? "var(--blue-athracite)" : "var(--color-text-primary)",
                  fontSize: "0.95rem",
                  fontFamily: "var(--font-body)",
                  transition: "background 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                {(option.flagIso2 || option.prefix) ? (
                  <span style={{ flexShrink: 0, width: "2rem", display: "flex", justifyContent: "center" }}>
                    <OptionLeadingVisual opt={option} />
                  </span>
                ) : null}
                <span style={{ flex: 1, minWidth: 0 }}>{option.label}</span>
              </div>
            ))}
          </div>
          {visibleOptions.length === 0 && searchPlaceholder && (
            <p role="status" style={{ padding: "0 1rem 0.75rem" }}>No countries found.</p>
          )}
        </div>
      )}

      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        tabIndex={searchPlaceholder ? -1 : undefined}
        onInvalid={searchPlaceholder ? (event) => {
          event.preventDefault();
          if (isOpen) searchRef.current?.focus();
          else openSelect();
        } : undefined}
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          width: 0,
          height: 0,
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {optionDisplayText(opt)}
          </option>
        ))}
      </select>
    </div>
  );
}
