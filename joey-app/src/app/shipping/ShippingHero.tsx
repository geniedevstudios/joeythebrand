"use client";

import { PAGE_HERO_SHELL_CLASS, usePageHeroBackgroundStyle, usePageHeroEmpty } from "@/hooks/usePageHero";
import styles from "./shipping.module.css";

export default function ShippingHero({ children }: { children: React.ReactNode }) {
  const bg = usePageHeroBackgroundStyle("shipping");
  const empty = usePageHeroEmpty("shipping");
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
