"use client";

import { usePageHeroBackgroundStyle } from "@/hooks/usePageHero";
import styles from "./shipping.module.css";

export default function ShippingHero({ children }: { children: React.ReactNode }) {
  const bg = usePageHeroBackgroundStyle("shipping");
  return (
    <div className={styles.header} style={bg}>
      {children}
    </div>
  );
}
