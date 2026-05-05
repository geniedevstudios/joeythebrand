"use client";
import { useState, useRef, useEffect } from "react";

type CustomDatePickerProps = {
  id?: string;
  name: string;
  value: string;
  onChange: (e: { target: { name: string; value: string } }) => void;
  min?: string;
  /** YYYY-MM-DD dates that cannot be selected (full calendar or user already booked). */
  disabledDates?: readonly string[];
  /** When true, Saturday & Sunday are crossed out and not selectable. Default true. */
  disableWeekends?: boolean;
  /** Optional footer CTA shown inside the calendar panel (e.g. Bespoke → Next: pick time). */
  nextLabel?: string;
  onNext?: () => void;
  nextDisabled?: boolean;
  /** When false, selecting a date keeps the panel open (useful when a Next button is present). */
  closeOnSelect?: boolean;
};

export default function CustomDatePicker({
  id,
  name,
  value,
  onChange,
  min,
  disabledDates,
  disableWeekends = true,
  nextLabel,
  onNext,
  nextDisabled = false,
  closeOnSelect = true,
}: CustomDatePickerProps) {
  const blocked = new Set(disabledDates ?? []);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) return new Date(value);
    return new Date();
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const handleSelectDate = (day: number) => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateString = `${yyyy}-${mm}-${dd}`;
    
    if (min && dateString < min) return;
    if (blocked.has(dateString)) return;
    if (disableWeekends) {
      const dow = d.getDay();
      if (dow === 0 || dow === 6) return;
    }

    onChange({ target: { name, value: dateString } });
    // If a Next CTA is present (e.g. pick time), keep the calendar open
    // so the user can confirm via the footer action.
    if (closeOnSelect && !onNext) setIsOpen(false);
  };

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i); 

  const formatDisplayDate = (d: string) => {
    if (!d) return "Select a preferred date";
    const [y, m, day] = d.split('-');
    const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(day));
    return dateObj.toLocaleDateString("en-US", { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <div id={id} ref={containerRef} style={{ position: "relative" }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          padding: "0.875rem 1rem",
          background: "rgba(255, 255, 255, 0.6)",
          backdropFilter: "blur(8px)",
          border: `1px solid ${isOpen ? "var(--blue-athracite)" : "var(--color-border)"}`,
          borderRadius: "var(--radius-md)",
          fontSize: "1rem",
          fontFamily: "var(--font-body)",
          color: value ? "var(--color-text-primary)" : "var(--cinereous)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          transition: "border-color var(--transition-fast), background var(--transition-fast)",
        }}
      >
        <span>{formatDisplayDate(value)}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s ease" }}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      </div>

      {isOpen && (
        <div style={{
          position: "absolute",
          top: "100%", left: 0, right: 0,
          marginTop: "4px",
          background: "rgba(255, 255, 255, 0.98)",
          backdropFilter: "blur(12px)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
          zIndex: 100,
          padding: "1.25rem",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <button type="button" onClick={handlePrevMonth} style={{ padding: "4px 8px", cursor: "pointer", color: "var(--blue-athracite)", background: "transparent", border: "none", fontSize: "1.2rem" }}>&larr;</button>
            <span style={{ fontFamily: "var(--font-label)", letterSpacing: "0.1em", color: "var(--blue-athracite)", fontSize: "1.1rem" }}>
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <button type="button" onClick={handleNextMonth} style={{ padding: "4px 8px", cursor: "pointer", color: "var(--blue-athracite)", background: "transparent", border: "none", fontSize: "1.2rem" }}>&rarr;</button>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", textAlign: "center", marginBottom: "12px" }}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <span key={d} style={{ fontSize: "0.75rem", color: "var(--cinereous)", fontFamily: "var(--font-label)" }}>{d}</span>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
            {blanks.map(b => <div key={`b-${b}`} />)}
            {days.map(day => {
              const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
              const yyyy = d.getFullYear();
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              const dd = String(d.getDate()).padStart(2, '0');
              const dateString = `${yyyy}-${mm}-${dd}`;
              
              const isPast = min ? dateString < min : false;
              const isBlocked = blocked.has(dateString);
              const dayOfWeek = d.getDay();
              const isWeekend = disableWeekends && (dayOfWeek === 0 || dayOfWeek === 6);
              const isDisabled = isPast || isBlocked || isWeekend;
              const isSelected = value === dateString;
              const crossOut = isBlocked || isWeekend;
              const titleHint = isWeekend ? "Weekend — unavailable" : isBlocked ? "Unavailable" : undefined;

              return (
                <button
                  key={day}
                  type="button"
                  title={titleHint}
                  onClick={() => !isDisabled && handleSelectDate(day)}
                  style={{
                    padding: "10px 0",
                    fontSize: "0.9rem",
                    fontFamily: "var(--font-body)",
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    color: isDisabled
                      ? "var(--cloudy-sky)"
                      : isSelected
                        ? "#fff"
                        : "var(--blue-athracite)",
                    background: isSelected ? "var(--blue-athracite)" : "transparent",
                    borderRadius: "6px",
                    border: "none",
                    opacity: isDisabled ? 0.45 : 1,
                    fontWeight: isSelected ? 500 : 300,
                    transition: "all 0.2s",
                    textDecoration: crossOut ? "line-through" : "none",
                  }}
                  onMouseOver={(e) => {
                    if (!isDisabled && !isSelected) {
                      e.currentTarget.style.background = "rgba(39, 43, 54, 0.08)";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isDisabled && !isSelected) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {onNext ? (
            <div
              style={{
                marginTop: "12px",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                type="button"
                disabled={nextDisabled}
                onClick={() => {
                  if (nextDisabled) return;
                  setIsOpen(false);
                  onNext();
                }}
                style={{
                  padding: "0.6rem 1rem",
                  borderRadius: "999px",
                  border: "1px solid var(--color-border)",
                  background: nextDisabled ? "rgba(39, 43, 54, 0.08)" : "var(--blue-athracite)",
                  color: nextDisabled ? "var(--cloudy-sky)" : "#fff",
                  fontFamily: "var(--font-label)",
                  fontSize: "0.82rem",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  cursor: nextDisabled ? "not-allowed" : "pointer",
                }}
              >
                {nextLabel || "Next"}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
