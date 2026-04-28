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
  /** Max height of the dropdown panel in pixels (default 240) */
  listMaxHeight?: number;
};

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
  listMaxHeight = 240,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

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
    queueMicrotask(() => {
      setHighlightedIndex(0);
    });
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (isOpen && options[highlightedIndex]) {
        const fakeEvent = {
          target: { name, value: options[highlightedIndex].value }
        } as React.ChangeEvent<HTMLSelectElement>;
        onChange(fakeEvent);
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < options.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
    }
  };

  const handleSelect = (optionValue: string) => {
    const fakeEvent = {
      target: { name, value: optionValue }
    } as React.ChangeEvent<HTMLSelectElement>;
    onChange(fakeEvent);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="custom-select-container" style={{ position: "relative" }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={`${id}-label`}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
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
          role="listbox"
          id={`${id}-listbox`}
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
            maxHeight: `${listMaxHeight}px`,
            overflowY: "auto",
            padding: "4px 0",
          }}
        >
          {options.map((option, index) => (
            <div
              key={option.value}
              role="option"
              aria-selected={value === option.value}
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
      )}
      
      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
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