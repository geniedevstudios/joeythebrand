"use client";
import { useState, useRef, useEffect } from "react";

type CustomDatePickerProps = {
  id?: string;
  name: string;
  value: string;
  onChange: (e: { target: { name: string; value: string } }) => void;
  min?: string;
};

export default function CustomDatePicker({ id, name, value, onChange, min }: CustomDatePickerProps) {
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

    onChange({ target: { name, value: dateString } });
    setIsOpen(false);
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
    <div ref={containerRef} style={{ position: "relative" }}>
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
              const isSelected = value === dateString;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => !isPast && handleSelectDate(day)}
                  style={{
                    padding: "10px 0",
                    fontSize: "0.9rem",
                    fontFamily: "var(--font-body)",
                    cursor: isPast ? "not-allowed" : "pointer",
                    color: isPast ? "var(--cloudy-sky)" : isSelected ? "#fff" : "var(--blue-athracite)",
                    background: isSelected ? "var(--blue-athracite)" : "transparent",
                    borderRadius: "6px",
                    border: "none",
                    opacity: isPast ? 0.6 : 1,
                    fontWeight: isSelected ? 500 : 300,
                    transition: "all 0.2s"
                  }}
                  onMouseOver={(e) => {
                    if (!isPast && !isSelected) {
                      e.currentTarget.style.background = "rgba(39, 43, 54, 0.08)";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isPast && !isSelected) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
