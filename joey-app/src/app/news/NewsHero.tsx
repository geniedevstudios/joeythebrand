"use client";

import PageHeroShellImageLoader from "@/components/page-hero/PageHeroShellImageLoader";
import {
  PAGE_HERO_SHELL_CLASS,
  usePageHeroShellRenderPropsWithSSRSeed,
} from "@/hooks/usePageHero";
import type { SiteContent } from "@/lib/types";
import styles from "./news.module.css";

export default function NewsHero({
  initialSiteContent,
  children,
}: {
  initialSiteContent: SiteContent;
  children: React.ReactNode;
}) {
  const { empty, shellSpinner, style, showImageLoader, imageReady } = usePageHeroShellRenderPropsWithSSRSeed(
    "news",
    initialSiteContent,
  );
  return (
    <div
      className={`${PAGE_HERO_SHELL_CLASS} ${styles.header}`}
      data-page-hero-empty={empty ? "true" : "false"}
      data-page-hero-loading={shellSpinner ? "true" : "false"}
      data-page-hero-ready={imageReady ? "true" : "false"}
      style={style}
    >
      {showImageLoader ? <PageHeroShellImageLoader /> : null}
      {children}
    </div>
  );
}
