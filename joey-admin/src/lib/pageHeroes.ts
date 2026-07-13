import type { PageHeroKey, PageHeroAnchor, PageHeroFit, PageHeroMedia, SiteContent } from "./types";

/** Empty until set in admin — no bundled placeholder assets. */
const EMPTY_PAGE_HERO: PageHeroMedia = { kind: "image", src: "", fit: "cover", anchor: "top" };

export const PAGE_HERO_KEYS: PageHeroKey[] = [
  "home",
  "shop",
  "story",
  "bespoke",
  "contact",
  "wishlist",
  "cart",
  "collection",
  "checkout",
  "account",
  "shipping",
  "privacy",
  "login",
  "product",
  "news",
  "report_issue",
  "events",
];

export const PAGE_HERO_LABELS: Record<PageHeroKey, string> = {
  home: "Home",
  shop: "Shop",
  story: "Story",
  bespoke: "Bespoke",
  contact: "Contact",
  wishlist: "Wishlist",
  cart: "Cart",
  collection: "Collection",
  checkout: "Checkout",
  account: "Account",
  shipping: "Shipping & returns",
  privacy: "Privacy policy",
  login: "Login",
  product: "Product (detail)",
  news: "News & Blog",
  report_issue: "Report an Issue",
  events: "Events",
};

export const DEFAULT_PAGE_HEROES: Record<PageHeroKey, PageHeroMedia> = {
  home: EMPTY_PAGE_HERO,
  shop: EMPTY_PAGE_HERO,
  story: EMPTY_PAGE_HERO,
  bespoke: EMPTY_PAGE_HERO,
  contact: EMPTY_PAGE_HERO,
  wishlist: EMPTY_PAGE_HERO,
  cart: EMPTY_PAGE_HERO,
  collection: EMPTY_PAGE_HERO,
  checkout: EMPTY_PAGE_HERO,
  account: EMPTY_PAGE_HERO,
  shipping: EMPTY_PAGE_HERO,
  privacy: EMPTY_PAGE_HERO,
  login: EMPTY_PAGE_HERO,
  product: EMPTY_PAGE_HERO,
  news: EMPTY_PAGE_HERO,
  report_issue: EMPTY_PAGE_HERO,
  events: EMPTY_PAGE_HERO,
};

function parseFit(o: Record<string, unknown>): PageHeroFit {
  return o.fit === "contain" ? "contain" : "cover";
}

function parseAnchor(o: Record<string, unknown>): PageHeroAnchor {
  const a = o.anchor;
  if (a === "center" || a === "bottom") return a;
  return "top";
}

function parseMedia(raw: unknown): PageHeroMedia | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const kind = o.kind === "video" ? "video" : o.kind === "image" ? "image" : null;
  const src = typeof o.src === "string" && o.src.trim() ? o.src.trim() : null;
  if (!kind || !src) return null;
  
  const tabletSrc = typeof o.tabletSrc === "string" && o.tabletSrc.trim() ? o.tabletSrc.trim() : undefined;
  const mobileSrc = typeof o.mobileSrc === "string" && o.mobileSrc.trim() ? o.mobileSrc.trim() : undefined;

  const fit = parseFit(o);
  const anchor = parseAnchor(o);

  if (kind === "video") {
    const tabletPosterUrl = typeof o.tabletPosterUrl === "string" && o.tabletPosterUrl.trim() ? o.tabletPosterUrl.trim() : undefined;
    const mobilePosterUrl = typeof o.mobilePosterUrl === "string" && o.mobilePosterUrl.trim() ? o.mobilePosterUrl.trim() : undefined;
    return { kind, src, tabletSrc, mobileSrc, tabletPosterUrl, mobilePosterUrl, fit, anchor };
  }
  
  return { kind, src, tabletSrc, mobileSrc, fit, anchor };
}

export function mergePageHeroes(
  raw: unknown,
  heroImageFallback: string
): Record<PageHeroKey, PageHeroMedia> {
  const base: Record<PageHeroKey, PageHeroMedia> = { ...DEFAULT_PAGE_HEROES };
  const trimmedFallback = heroImageFallback?.trim() ?? "";
  base.home = { kind: "image", src: trimmedFallback, fit: "cover", anchor: "top" };

  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    for (const key of PAGE_HERO_KEYS) {
      const parsed = parseMedia(obj[key]);
      if (parsed) {
        if (key !== "home" && key !== "events" && parsed.kind === "video") {
          base[key] = {
            kind: "image",
            src: parsed.src,
            tabletSrc: parsed.tabletSrc,
            mobileSrc: parsed.mobileSrc,
            fit: parsed.fit,
            anchor: parsed.anchor,
          };
        } else {
          base[key] = parsed;
        }
      }
    }
  }

  return base;
}

export function siteContentWithPageHeroes(row: Record<string, unknown>): Pick<SiteContent, "pageHeroes" | "heroImage"> {
  const heroImageCol = typeof row.hero_image === "string" ? row.hero_image : "";
  const pageHeroes = mergePageHeroes(row.page_heroes, heroImageCol);
  const heroImage =
    pageHeroes.home.kind === "image" ? pageHeroes.home.src : heroImageCol;
  return { pageHeroes, heroImage };
}
