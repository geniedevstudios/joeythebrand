"use client";

import { PAGE_HERO_SHELL_CLASS, usePageHeroBackgroundStyle, usePageHeroEmpty } from "@/hooks/usePageHero";
import styles from "../shipping/shipping.module.css";

export default function PrivacyHero({ children }: { children: React.ReactNode }) {
  const bg = usePageHeroBackgroundStyle("privacy");
  const empty = usePageHeroEmpty("privacy");
  return (
    <div
      className={`${PAGE_HERO_SHELL_CLASS} ${styles.header}`}
      data-page-hero-empty={empty ? "true" : "false"}
      style={bg}
    >
      {children}
    </div>
  );
}
