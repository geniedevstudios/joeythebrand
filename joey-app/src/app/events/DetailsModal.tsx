"use client";

import { useEffect } from "react";
import styles from "./DetailsModal.module.css";
import InlineNewsletterForm from "./InlineNewsletterForm";
import type { PublicEvent } from "@/lib/fetchEventsServer";

function formatWhen(startAt?: string, dateLabel?: string): string | null {
  const label = (dateLabel ?? "").trim();
  if (startAt) {
    const d = new Date(startAt);
    if (!Number.isNaN(d.getTime())) {
      return `${d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })} · ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
    }
  }
  return label || null;
}

export default function DetailsModal({
  open,
  onClose,
  event,
}: {
  open: boolean;
  onClose: () => void;
  event: PublicEvent | null;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const title = event?.title ? `${event.title} — details` : "Details";
  const when = formatWhen(event?.startAt, event?.dateLabel);
  const detailsText = (event?.details ?? "").trim();
  const showEventDetails = Boolean(event?.detailsReady && (detailsText || when || event?.location?.trim()));

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleWrap}>
            <div className={styles.kicker}>Details</div>
            <h2 className={styles.title}>{event?.title ?? "Details"}</h2>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className={styles.body}>
          {showEventDetails ? (
            <>
              {when ? <p className={styles.message}>{when}</p> : null}
              {event?.location?.trim() ? (
                <p className={styles.message}>{event.location}</p>
              ) : null}
              {detailsText ? <p className={styles.message}>{detailsText}</p> : null}
            </>
          ) : (
            <>
              <p className={styles.message}>
                Details will be live soon. Join our newsletter to stay in the loop.
              </p>
              <div className={styles.newsletterShell}>
                <InlineNewsletterForm idPrefix="events-details-modal" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

