"use client";

import { useEffect, useState } from "react";
import styles from "./SizeGuideModal.module.css";

export type SizeGuideKind = "mens" | "womens" | "both";

const MENS_ROWS: Array<{ size: string; chest: string; back: string; arm: string; sleeve: string; length: string; neck: string }> = [
  { size: "S", chest: "42–44", back: "17", arm: "15.5", sleeve: "9 / 18", length: "32", neck: "16" },
  { size: "M", chest: "44–46", back: "18", arm: "16", sleeve: "9 / 18", length: "32", neck: "16.5" },
  { size: "L", chest: "46–48", back: "19", arm: "17", sleeve: "9 / 18", length: "32", neck: "17" },
  { size: "XL", chest: "48–50", back: "20", arm: "18", sleeve: "10 / 18", length: "32", neck: "17" },
  { size: "XXL", chest: "52–54", back: "21", arm: "19", sleeve: "10 / 18", length: "32", neck: "17.5" },
];

const WOMENS_STANDARD_ROWS: Array<{ uk: string; bust: string; waist: string; hip: string }> = [
  { uk: "6", bust: "32", waist: "24", hip: "35" },
  { uk: "8", bust: "34", waist: "26", hip: "38" },
  { uk: "10", bust: "36", waist: "28", hip: "40" },
  { uk: "12", bust: "38", waist: "30", hip: "42" },
  { uk: "14", bust: "41", waist: "33", hip: "45" },
  { uk: "16", bust: "43", waist: "36", hip: "48" },
  { uk: "18", bust: "46", waist: "39", hip: "51" },
  { uk: "20", bust: "48", waist: "42", hip: "54" },
  { uk: "22", bust: "52", waist: "45", hip: "57" },
];

const WOMENS_THICK_ROWS: Array<{ label: string; bust: string; waist: string; hip: string }> = [
  { label: "Small [UK 8/10]", bust: "35.5 / 41", waist: "27 / 30", hip: "43 / 46" },
  { label: "Medium [UK 12/14]", bust: "38 / 44", waist: "30 / 34", hip: "47 / 50" },
  { label: "Large [UK 16/18]", bust: "44 / 46", waist: "34 / 38", hip: "50 / 54" },
  { label: "XLarge [UK 20/22]", bust: "47 / 52", waist: "38 / 42", hip: "56 / 60" },
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
  const [womensFit, setWomensFit] = useState<"standard" | "thick">("standard");

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
          <p className={styles.unitNotice}>All measurements are in inches.</p>
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
                      <th>CHEST</th>
                      <th>BACK</th>
                      <th>ARM</th>
                      <th>SLEEVE</th>
                      <th>LENGTH</th>
                      <th>NECK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MENS_ROWS.map((r) => (
                      <tr key={r.size}>
                        <td className={styles.sizeCell}>{r.size}</td>
                        <td>{r.chest}</td>
                        <td>{r.back}</td>
                        <td>{r.arm}</td>
                        <td>{r.sleeve}</td>
                        <td>{r.length}</td>
                        <td>{r.neck}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {kind === "womens" || kind === "both" ? (
            <div className={styles.block}>
              <div className={styles.womensHeader}>
                {kind === "both" ? <p className={styles.subhead}>Women&apos;s wear</p> : <div />}
                <div className={styles.fitSelector}>
                  <button
                    className={`${styles.fitBtn} ${womensFit === "standard" ? styles.fitBtnActive : ""}`}
                    onClick={() => setWomensFit("standard")}
                  >
                    Standard Fit
                  </button>
                  <button
                    className={`${styles.fitBtn} ${womensFit === "thick" ? styles.fitBtnActive : ""}`}
                    onClick={() => setWomensFit("thick")}
                  >
                    Thick Fit
                  </button>
                </div>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  {womensFit === "standard" ? (
                    <>
                      <thead>
                        <tr>
                          <th>UK SIZE</th>
                          <th>BUST</th>
                          <th>WAIST</th>
                          <th>HIP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {WOMENS_STANDARD_ROWS.map((r) => (
                          <tr key={r.uk}>
                            <td className={styles.sizeCell}>UK {r.uk}</td>
                            <td>{r.bust}</td>
                            <td>{r.waist}</td>
                            <td>{r.hip}</td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  ) : (
                    <>
                      <thead>
                        <tr>
                          <th>LABEL</th>
                          <th>BUST</th>
                          <th>WAIST</th>
                          <th>HIP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {WOMENS_THICK_ROWS.map((r) => (
                          <tr key={r.label}>
                            <td className={styles.sizeCell}>{r.label}</td>
                            <td>{r.bust}</td>
                            <td>{r.waist}</td>
                            <td>{r.hip}</td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

