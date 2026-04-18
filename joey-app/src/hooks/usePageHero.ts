"use client";

import type { CSSProperties } from "react";
import { useLayoutEffect, useState, useSyncExternalStore } from "react";
import { dataStore } from "@/lib/dataStore";
import type { PageHeroKey, PageHeroMedia, SiteContent } from "@/lib/types";
import { getPageHeroMedia, backgroundImageUrl, resolveHeroLayout } from "@/lib/pageHeroes";
import { useStoreLoading } from "@/hooks/useStoreLoading";

// Stable snapshot functions — defined outside components so React never sees
// a changed getSnapshot reference across renders (would force re-subscription).
const _getPageHeroesSnapshot = () => dataStore.getSiteContent().pageHeroes;

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

/** Image URL for hero layer (empty = no image; black bg — shell loader only during {@link usePageHeroShellSpinner}). */
export function usePageHeroImageSrc(key: PageHeroKey): string {
  const m = usePageHeroMedia(key);
  return (m.src ?? "").trim();
}

export function usePageHeroImageSrcWithSSRSeed(key: PageHeroKey, initialSiteContent: SiteContent): string {
  const m = usePageHeroMediaWithSSRSeed(key, initialSiteContent);
  return (m.src ?? "").trim();
}

/** Global class for hero regions: pairs with `data-page-hero-empty`, `data-page-hero-loading`, and `globals.css`. */
export const PAGE_HERO_SHELL_CLASS = "page-hero-shell";

export function usePageHeroEmpty(key: PageHeroKey): boolean {
  return !usePageHeroImageSrc(key).trim();
}

export function usePageHeroEmptyWithSSRSeed(key: PageHeroKey, initialSiteContent: SiteContent): boolean {
  return !usePageHeroImageSrcWithSSRSeed(key, initialSiteContent).trim();
}

/** Spinner on `.page-hero-shell` only while the first `dataStore.init()` is in flight and the hero has no image; then black bg only. */
export function usePageHeroShellSpinner(key: PageHeroKey): boolean {
  const loading = useStoreLoading();
  const empty = usePageHeroEmpty(key);
  return loading && empty;
}

export function usePageHeroShellSpinnerWithSSRSeed(key: PageHeroKey, initialSiteContent: SiteContent): boolean {
  const loading = useStoreLoading();
  const empty = usePageHeroEmptyWithSSRSeed(key, initialSiteContent);
  return loading && empty;
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

/** Black only (same layout slots as the final hero) while the hero image is still decoding — matches video poster + loader UX. */
function heroBlackPlaceholderStyle(m: PageHeroMedia): CSSProperties {
  const { fit, position } = resolveHeroLayout(m);
  return {
    backgroundColor: "#000000",
    backgroundImage: "none",
    backgroundSize: fit === "contain" ? "contain" : "cover",
    backgroundPosition: position,
    backgroundRepeat: "no-repeat",
  };
}

/**
 * True once the hero image URL has loaded in memory (or there is no URL).
 * Drives black + spinner on top until the CSS background image would paint, like home/events video posters.
 */
export function usePageHeroImageReady(rawSrc: string): boolean {
  const src = rawSrc.trim();
  const [ready, setReady] = useState(() => src === "");

  useLayoutEffect(() => {
    if (!src) {
      queueMicrotask(() => setReady(true));
      return;
    }
    queueMicrotask(() => setReady(false));
    let cancelled = false;
    const img = new Image();
    const finish = () => {
      if (!cancelled) setReady(true);
    };
    img.onload = finish;
    img.onerror = finish;
    img.src = src;
    if (img.complete && img.naturalWidth > 0) queueMicrotask(finish);
    return () => {
      cancelled = true;
    };
  }, [src]);

  return ready;
}

/** Shell: empty-init spinner attrs + resolved background style + full-bleed loader while the hero image downloads/decodes. */
export function usePageHeroShellRenderProps(pageKey: PageHeroKey) {
  const m = usePageHeroMedia(pageKey);
  const src = usePageHeroImageSrc(pageKey);
  const empty = !src.trim();
  const shellSpinner = usePageHeroShellSpinner(pageKey);
  const imageReady = usePageHeroImageReady(src);
  const style =
    !empty && !imageReady ? heroBlackPlaceholderStyle(m) : heroBackgroundStyleFromMedia(m, src);
  const showImageLoader = !empty && !imageReady;
  return { empty, shellSpinner, style, showImageLoader };
}

export function usePageHeroShellRenderPropsWithSSRSeed(pageKey: PageHeroKey, initialSiteContent: SiteContent) {
  const m = usePageHeroMediaWithSSRSeed(pageKey, initialSiteContent);
  const src = usePageHeroImageSrcWithSSRSeed(pageKey, initialSiteContent);
  const empty = !src.trim();
  const shellSpinner = usePageHeroShellSpinnerWithSSRSeed(pageKey, initialSiteContent);
  const imageReady = usePageHeroImageReady(src);
  const style =
    !empty && !imageReady ? heroBlackPlaceholderStyle(m) : heroBackgroundStyleFromMedia(m, src);
  const showImageLoader = !empty && !imageReady;
  return { empty, shellSpinner, style, showImageLoader };
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
