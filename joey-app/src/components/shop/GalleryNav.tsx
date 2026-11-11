"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./GalleryNav.module.css";

export function stepGalleryImage(images: string[], current: string, direction: number) {
  if (images.length === 0) return current;
  const idx = images.indexOf(current);
  const from = idx >= 0 ? idx : 0;
  return images[(from + direction + images.length) % images.length];
}

export default function GalleryNav({
  count,
  onPrev,
  onNext,
}: {
  count: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (count < 2) return null;
  return (
    <div className={styles.nav}>
      <button
        type="button"
        aria-label="Previous photograph"
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
      >
        <ChevronLeft size={16} />
      </button>
      <button
        type="button"
        aria-label="Next photograph"
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
