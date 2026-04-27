"use client";

import Image from "next/image";
import styles from "./PageHeroShellImageLoader.module.css";

/** Full-bleed black + ring while the route hero background image is still loading (see {@link usePageHeroShellRenderProps}). */
export default function PageHeroShellImageLoader() {
  return (
    <div className={styles.overlay} style={{ zIndex: 4 }} aria-hidden>
      <Image
        src="/white%20logo.png"
        alt=""
        width={560}
        height={112}
        priority
        className={styles.logo}
        sizes="(max-width: 768px) 70vw, 320px"
      />
      <div className={styles.spinner} />
    </div>
  );
}
