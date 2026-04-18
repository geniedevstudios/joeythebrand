"use client";

import styles from "./PageHeroShellImageLoader.module.css";

/** Full-bleed black + ring while the route hero background image is still loading (see {@link usePageHeroShellRenderProps}). */
export default function PageHeroShellImageLoader() {
  return (
    <div className={styles.overlay} style={{ zIndex: 4 }} aria-hidden>
      <div className={styles.spinner} />
    </div>
  );
}
