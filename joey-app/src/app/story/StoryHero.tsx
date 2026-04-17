"use client";

import { PAGE_HERO_SHELL_CLASS, usePageHeroBackgroundStyle, usePageHeroEmpty } from "@/hooks/usePageHero";
import styles from "./story.module.css";

export default function StoryHero({ children }: { children: React.ReactNode }) {
  const bg = usePageHeroBackgroundStyle("story");
  const empty = usePageHeroEmpty("story");
  return (
    <div
      className={`${PAGE_HERO_SHELL_CLASS} ${styles.hero}`}
      data-page-hero-empty={empty ? "true" : "false"}
      style={bg}
    >
      {children}
    </div>
  );
}
