"use client";

import PageHeroShellImageLoader from "@/components/page-hero/PageHeroShellImageLoader";
import {
  PAGE_HERO_SHELL_CLASS,
  usePageHeroShellRenderProps,
} from "@/hooks/usePageHero";
import styles from "./story.module.css";

export default function StoryHero({ children }: { children: React.ReactNode }) {
  const { empty, shellSpinner, style, showImageLoader } = usePageHeroShellRenderProps("story");
  return (
    <div
      className={`${PAGE_HERO_SHELL_CLASS} ${styles.hero}`}
      data-page-hero-empty={empty ? "true" : "false"}
      data-page-hero-loading={shellSpinner ? "true" : "false"}
      style={style}
    >
      {showImageLoader ? <PageHeroShellImageLoader /> : null}
      {children}
    </div>
  );
}
