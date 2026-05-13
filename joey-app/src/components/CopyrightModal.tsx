"use client";

import { useEffect } from "react";
import styles from "./CopyrightModal.module.css";

export default function CopyrightModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.content} role="dialog" aria-modal="true" aria-labelledby="copyright-title">
        <button type="button" className={styles.close} aria-label="Close modal" onClick={onClose}>
          &times;
        </button>

        <div className={styles.header}>
          <h2 id="copyright-title" className={styles.title}>Copyright Notice</h2>
        </div>

        <div className={styles.body}>
          <p className={styles.text}>
            All images, designs, and content featured on this platform are the exclusive property of <span className={styles.bold}>JOEY THE BRAND</span>.
          </p>
          <p className={styles.text}>
            Unauthorized use, reproduction, or distribution of these assets is strictly prohibited. 
          </p>
          <p className={styles.text}>
            If you wish to feature our work elsewhere, please provide proper credit by tagging our official Instagram handle:
          </p>
          <a 
            href="https://www.instagram.com/joey_thebrand/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className={styles.instagram}
          >
            @joey_thebrand
          </a>
        </div>
      </div>
    </div>
  );
}
