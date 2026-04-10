"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePortfolioBooking } from "@/components/booking/PortfolioBookingProvider";
import { SERVICES } from "@/lib/servicesData";
import styles from "./ServicesCards.module.css";

export default function ServicesCards() {
  const { openBooking } = usePortfolioBooking();
  const [openId, setOpenId] = useState<string | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  const open = openId ? SERVICES.find((s) => s.id === openId) ?? null : null;

  const close = useCallback(() => setOpenId(null), []);

  useEffect(() => {
    if (!openId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [openId]);

  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId, close]);

  return (
    <>
      <div className={styles.grid}>
        {SERVICES.map((s) => (
          <article
            key={s.id}
            className={styles.card}
            tabIndex={0}
            role="button"
            aria-haspopup="dialog"
            aria-label={`${s.title}. Open details`}
            onClick={() => setOpenId(s.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpenId(s.id);
              }
            }}
          >
            <h3 className={styles.cardTitle}>{s.title}</h3>
            <p className={styles.cardSummary}>{s.summary}</p>
            <span className={styles.cardHint} aria-hidden="true">
              View details
            </span>
          </article>
        ))}
      </div>

      {open && (
        <div className={styles.overlay} role="presentation" onClick={close}>
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
          >
            <button ref={closeBtnRef} type="button" className={styles.closeBtn} onClick={close} aria-label="Close">
              ×
            </button>
            <h2 id={titleId} className={styles.dialogTitle}>
              {open.title}
            </h2>
            <p className={styles.dialogLead}>{open.summary}</p>
            <p className={styles.dialogBody}>{open.detail}</p>
            <button
              type="button"
              className={styles.dialogCta}
              onClick={() => {
                close();
                openBooking(open.title);
              }}
            >
              Book a consultation
            </button>
          </div>
        </div>
      )}
    </>
  );
}
