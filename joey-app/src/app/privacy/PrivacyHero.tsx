"use client";

import { usePageHeroBackgroundStyle } from "@/hooks/usePageHero";
import styles from "../shipping/shipping.module.css";

export default function PrivacyHero({ children }: { children: React.ReactNode }) {
  const bg = usePageHeroBackgroundStyle("privacy");
  return (
    <div className={styles.header} style={bg}>
      {children}
    </div>
  );
}
