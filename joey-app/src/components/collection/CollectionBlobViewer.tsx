"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "@/app/collection/CollectionClient.module.css";

/** objectBoundingBox paths — 8 distinct silhouettes (cycles by index). */
export const COLLECTION_BLOB_PATHS = [
  "M0.8,0.2 C0.9,0.3, 0.9,0.7, 0.75,0.85 C0.6,1, 0.3,0.9, 0.15,0.7 C0,0.5, 0,0.3, 0.2,0.15 C0.4,0, 0.6,0.1, 0.8,0.2 Z",
  "M0.6,0.1 C0.8,0.1, 1,0.4, 0.9,0.7 C0.8,1, 0.5,1, 0.2,0.9 C-0.1,0.8, 0,0.4, 0.1,0.2 C0.2,0, 0.4,0.1, 0.6,0.1 Z",
  "M0.75,0.15 C0.95,0.25, 1,0.6, 0.8,0.8 C0.6,1, 0.3,1, 0.15,0.8 C0,0.6, 0,0.3, 0.15,0.15 C0.3,0, 0.55,0.05, 0.75,0.15 Z",
  "M0.35,0.05 C0.65,-0.05, 0.9,0.2, 0.95,0.5 C1,0.8, 0.7,1, 0.4,0.95 C0.1,0.9, 0,0.6, 0,0.3 C0,0, 0.05,0.15, 0.35,0.05 Z",
  "M0.5,0.06 C0.82,0.06 0.94,0.32 0.91,0.52 C0.88,0.78 0.68,0.96 0.5,0.96 C0.32,0.96 0.12,0.78 0.09,0.52 C0.06,0.32 0.18,0.06 0.5,0.06 Z",
  "M0.5,0.03 C0.7,0.14 0.86,0.42 0.84,0.66 C0.82,0.9 0.58,0.97 0.5,0.97 C0.42,0.97 0.18,0.9 0.16,0.66 C0.14,0.42 0.3,0.14 0.5,0.03 Z",
  "M0.5,0.04 L0.86,0.3 C0.96,0.46 0.93,0.7 0.72,0.9 L0.5,0.97 L0.28,0.9 C0.07,0.7 0.04,0.46 0.14,0.3 Z",
  "M0.28,0.14 C0.12,0.34 0.1,0.62 0.24,0.86 C0.4,0.97 0.64,0.94 0.8,0.78 C0.96,0.58 0.98,0.34 0.84,0.16 C0.68,0.04 0.42,0.04 0.28,0.14 Z",
];

export function CollectionBlobClipDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }} aria-hidden>
      <defs>
        {COLLECTION_BLOB_PATHS.map((path, idx) => (
          <clipPath key={`clip-${idx}`} id={`blob-mask-${idx}`} clipPathUnits="objectBoundingBox">
            <path d={path} />
          </clipPath>
        ))}
      </defs>
    </svg>
  );
}

type Props = {
  images: string[];
  slug: string;
  blobIndex: number;
  fallbackImage?: string;
  /** Index list links to /collection/[slug]; detail page uses showcase (no link, no CTA overlay). */
  variant?: "index" | "detail";
};

export function CollectionBlobViewer({ images, slug, blobIndex, fallbackImage, variant = "index" }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % images.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [images]);

  const clipId = `blob-mask-${blobIndex % COLLECTION_BLOB_PATHS.length}`;
  const validFallback =
    fallbackImage?.startsWith("/") || fallbackImage?.startsWith("http") ? fallbackImage : null;
  const renderImages = images.length > 0 ? images : validFallback ? [validFallback] : [];

  const inner = (
    <>
      <div
        className={styles.blobContainer}
        style={{
          clipPath: `url(#${clipId})`,
          WebkitClipPath: `url(#${clipId})`,
        }}
      >
        {renderImages.map((img, i) => (
          <img
            key={`${img}-${i}`}
            src={img}
            alt={variant === "detail" ? "" : "Collection product"}
            className={`${styles.blobImage} ${i === activeIdx ? styles.blobImageActive : ""}`}
            loading="lazy"
          />
        ))}
        {variant === "index" ? (
          <div className={styles.blobOverlay}>
            <span className={styles.pickMeBtn}>VIEW PIECES</span>
          </div>
        ) : null}
      </div>
    </>
  );

  if (variant === "detail") {
    return (
      <div
        className={styles.blobViewerWrapper}
        role="img"
        aria-label={`${slug} collection imagery`}
      >
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={`/collection/${slug}`}
      className={styles.blobViewerWrapper}
      aria-label={`View ${slug} collection pieces`}
    >
      {inner}
    </Link>
  );
}
