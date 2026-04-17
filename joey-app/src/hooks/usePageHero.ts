"use client";

import type { CSSProperties } from "react";
import { useSyncExternalStore } from "react";
import { dataStore } from "@/lib/dataStore";
import type { PageHeroKey, PageHeroMedia, SiteContent } from "@/lib/types";
import { getPageHeroMedia, backgroundImageUrl, resolveHeroLayout } from "@/lib/pageHeroes";

// Stable snapshot functions — defined outside components so React never sees
// a changed getSnapshot reference across renders (would force re-subscription).
const _getPageHeroesSnapshot = () => dataStore.getSiteContent().pageHeroes;
const _getIsInitializing = () => dataStore.isInitializing();
const _serverIsInitializing = () => false;

export function usePageHeroMedia(key: PageHeroKey): PageHeroMedia {
  const pageHeroes = useSyncExternalStore(
    dataStore.subscribe,
    _getPageHeroesSnapshot,
    _getPageHeroesSnapshot,
  );
  return getPageHeroMedia(pageHeroes, key);
}

/**
 * Any page hero: prefer SSR `initialSiteContent.pageHeroes` until remote `site_content` has been
 * applied to the client store — avoids a flash of wrong defaults before `init()`.
 */
export function usePageHeroMediaWithSSRSeed(key: PageHeroKey, initialSiteContent: SiteContent): PageHeroMedia {
  return useSyncExternalStore(
    dataStore.subscribe,
    () =>
      getPageHeroMedia(
        dataStore.hasAppliedSiteContentFromRemote()
          ? dataStore.getSiteContent().pageHeroes
          : initialSiteContent.pageHeroes,
        key,
      ),
    () => getPageHeroMedia(initialSiteContent.pageHeroes, key),
  );
}

/** Home hero: thin wrapper around {@link usePageHeroMediaWithSSRSeed} for `"home"`. */
export function useHomeHeroMediaWithSSRSeed(initialSiteContent: SiteContent): PageHeroMedia {
  return usePageHeroMediaWithSSRSeed("home", initialSiteContent);
}

export function useHomeHeroPosterWithSSRSeed(initialSiteContent: SiteContent): string {
  return useSyncExternalStore(
    dataStore.subscribe,
    () =>
      dataStore.hasAppliedSiteContentFromRemote()
        ? dataStore.getSiteContent().heroImage
        : initialSiteContent.heroImage,
    () => initialSiteContent.heroImage,
  );
}

/** Image URL for hero layer (empty = no image; black + loader via {@link PAGE_HERO_SHELL_CLASS}). */
export function usePageHeroImageSrc(key: PageHeroKey): string {
  const m = usePageHeroMedia(key);
  return (m.src ?? "").trim();
}

export function usePageHeroImageSrcWithSSRSeed(key: PageHeroKey, initialSiteContent: SiteContent): string {
  const m = usePageHeroMediaWithSSRSeed(key, initialSiteContent);
  return (m.src ?? "").trim();
}

/** Global class for hero regions: pairs with `data-page-hero-empty` and `globals.css` (spinner, dim overlay off). */
export const PAGE_HERO_SHELL_CLASS = "page-hero-shell";

export function usePageHeroEmpty(key: PageHeroKey): boolean {
  return !usePageHeroImageSrc(key).trim();
}

export function usePageHeroEmptyWithSSRSeed(key: PageHeroKey, initialSiteContent: SiteContent): boolean {
  return !usePageHeroImageSrcWithSSRSeed(key, initialSiteContent).trim();
}

function heroBackgroundStyleFromMedia(m: PageHeroMedia, src: string): CSSProperties {
  const { fit, position } = resolveHeroLayout(m);
  // Always use the same set of non-shorthand properties so React's reconciler
  // never has to remove `background` while keeping `backgroundPosition` etc.
  // (mixing shorthand + non-shorthand properties causes a React style conflict crash).
  return {
    backgroundColor: src.trim() ? undefined : "#000000",
    backgroundImage: src.trim() ? backgroundImageUrl(src) : "none",
    backgroundSize: fit === "contain" ? "contain" : "cover",
    backgroundPosition: position,
    backgroundRepeat: "no-repeat",
  };
}

export function usePageHeroBackgroundStyle(key: PageHeroKey): CSSProperties {
  const m = usePageHeroMedia(key);
  const src = usePageHeroImageSrc(key);
  return heroBackgroundStyleFromMedia(m, src);
}

/** Like {@link usePageHeroBackgroundStyle} but uses SSR seed until remote site content is applied (Contact, Bespoke, etc.). */
export function usePageHeroBackgroundStyleWithSSRSeed(key: PageHeroKey, initialSiteContent: SiteContent): CSSProperties {
  const m = usePageHeroMediaWithSSRSeed(key, initialSiteContent);
  const src = usePageHeroImageSrcWithSSRSeed(key, initialSiteContent);
  return heroBackgroundStyleFromMedia(m, src);
}
