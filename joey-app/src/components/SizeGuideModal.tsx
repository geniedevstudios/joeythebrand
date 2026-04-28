"use client";

import { useEffect } from "react";
import styles from "./SizeGuideModal.module.css";

export type SizeGuideKind = "mens" | "womens" | "both";

const MENS_ROWS: Array<{ size: string; chest: string; waist: string; hips: string }> = [
  { size: "XS", chest: "34–36", waist: "27–29", hips: "34.5–36.5" },
  { size: "S", chest: "36–38", waist: "29–31", hips: "36.5–38.5" },
  { size: "M", chest: "38–40", waist: "31–33", hips: "38.5–40.5" },
  { size: "L", chest: "40–42", waist: "33–36", hips: "40.5–43.5" },
  { size: "XL", chest: "42–45", waist: "36–40", hips: "43.5–47.5" },
  { size: "XXL", chest: "45–48", waist: "40–44", hips: "47.5–51.5" },
];

const WOMENS_ROWS: Array<{ uk: string; us: string; bust: string; waist: string; hip: string }> = [
  { uk: "8", us: "4", bust: '33"', waist: '26"', hip: '36"' },
  { uk: "10", us: "6", bust: '35"', waist: '28"', hip: '38"' },
  { uk: "12", us: "8", bust: '37"', waist: '30"', hip: '42"' },
  { uk: "14", us: "10", bust: '39"', waist: '33"', hip: '46"' },
  { uk: "16", us: "12", bust: '43"', waist: '35"', hip: '48"' },
  { uk: "18", us: "14", bust: '45"', waist: '37"', hip: '50"' },
  { uk: "20", us: "16", bust: '47"', waist: '39"', hip: '52"' },
  { uk: "22", us: "18", bust: '49"', waist: '41"', hip: '54"' },
  { uk: "24", us: "20", bust: '51"', waist: '43"', hip: '56"' },
];

export default function SizeGuideModal({
  open,
  onClose,
  kind,
}: {
  open: boolean;
  onClose: () => void;
  kind: SizeGuideKind;
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
      <div className={styles.content} role="dialog" aria-modal="true" aria-label="Size guide">
        <button type="button" className={styles.close} aria-label="Close size guide" onClick={onClose}>
          ×
        </button>

        <div className={styles.header}>
          <h2 className={styles.title}>Size Guide</h2>
        </div>

        <div className={styles.body}>
          {kind === "mens" || kind === "both" ? (
            <div className={styles.block}>
              {kind === "both" ? <p className={styles.subhead}>Men&apos;s wear</p> : null}
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>SIZE</th>
                      <th>CHEST (IN.)</th>
                      <th>WAIST (IN.)</th>
                      <th>HIPS (IN.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MENS_ROWS.map((r) => (
                      <tr key={r.size}>
                        <td>{r.size}</td>
                        <td>{r.chest}</td>
                        <td>{r.waist}</td>
                        <td>{r.hips}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {kind === "womens" || kind === "both" ? (
            <div className={styles.block}>
              {kind === "both" ? <p className={styles.subhead}>Women&apos;s wear</p> : null}
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>UK</th>
                      <th>US</th>
                      <th>BUST</th>
                      <th>WAIST</th>
                      <th>HIP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {WOMENS_ROWS.map((r) => (
                      <tr key={`${r.uk}-${r.us}`}>
                        <td>{r.uk}</td>
                        <td>{r.us}</td>
                        <td>{r.bust}</td>
                        <td>{r.waist}</td>
                        <td>{r.hip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

