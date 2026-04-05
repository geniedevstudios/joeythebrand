"use client";

import type { CSSProperties } from "react";
import { useSyncExternalStore } from "react";
import { dataStore } from "@/lib/dataStore";
import type { PageHeroKey, PageHeroMedia, SiteContent } from "@/lib/types";
import { getPageHeroMedia, backgroundImageUrl, resolveHeroLayout } from "@/lib/pageHeroes";

export function usePageHeroMedia(key: PageHeroKey): PageHeroMedia {
  return useSyncExternalStore(
    dataStore.subscribe,
    () => getPageHeroMedia(dataStore.getSiteContent().pageHeroes, key),
    () => getPageHeroMedia(dataStore.getSiteContent().pageHeroes, key)
  );
}

/** Home hero only: uses SSR `site_content` until client `init()` finishes so the first paint matches the server (no default-image flash). */
export function useHomeHeroMediaWithSSRSeed(initialSiteContent: SiteContent): PageHeroMedia {
  return useSyncExternalStore(
    dataStore.subscribe,
    () =>
      getPageHeroMedia(
        dataStore.hasRemoteSiteContentResolved()
          ? dataStore.getSiteContent().pageHeroes
          : initialSiteContent.pageHeroes,
        "home",
      ),
    () => getPageHeroMedia(initialSiteContent.pageHeroes, "home"),
  );
}

export function useHomeHeroPosterWithSSRSeed(initialSiteContent: SiteContent): string {
  return useSyncExternalStore(
    dataStore.subscribe,
    () =>
      dataStore.hasRemoteSiteContentResolved()
        ? dataStore.getSiteContent().heroImage
        : initialSiteContent.heroImage,
    () => initialSiteContent.heroImage,
  );
}

/** Image URL for backgrounds (uses image src even if entry was mis-set to video on non-home). */
export function usePageHeroImageSrc(key: PageHeroKey): string {
  const m = usePageHeroMedia(key);
  return m.kind === "video" && key !== "home" ? "/hero.png" : m.src;
}

export function usePageHeroBackgroundStyle(key: PageHeroKey): CSSProperties {
  const m = usePageHeroMedia(key);
  const src = usePageHeroImageSrc(key);
  const { fit, position } = resolveHeroLayout(m);
  return {
    backgroundImage: backgroundImageUrl(src),
    backgroundSize: fit === "contain" ? "contain" : "cover",
    backgroundPosition: position,
    backgroundRepeat: "no-repeat",
  };
}
