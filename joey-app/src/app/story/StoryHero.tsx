"use client";

import { usePageHeroBackgroundStyle } from "@/hooks/usePageHero";
import styles from "./story.module.css";

export default function StoryHero({ children }: { children: React.ReactNode }) {
  const bg = usePageHeroBackgroundStyle("story");
  return (
    <div className={styles.hero} style={bg}>
      {children}
    </div>
  );
}
