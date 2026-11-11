"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PAGE_HERO_KEYS } from "@/lib/pageHeroes";
import type { PageHeroKey } from "@/lib/types";
import { adminPillClass, adminPillTrackClass } from "@/lib/adminChrome";

const PRIMARY = [
  { id: "home", label: "Home", href: "/content/app-pages/home" },
  { id: "events", label: "Events", href: "/content/app-pages/events" },
  { id: "news", label: "News & Blog", href: "/content/app-pages/news-blog" },
  { id: "story", label: "Story", href: "/content/app-pages/about" },
  { id: "bespoke", label: "Bespoke", href: "/content/app-pages/heroes/bespoke" },
  { id: "shop", label: "Shop", href: "/content/app-pages/heroes/shop" },
  { id: "contact", label: "Contact", href: "/content/app-pages/heroes/contact" },
  { id: "cart", label: "Cart", href: "/content/app-pages/heroes/cart" },
  { id: "collection", label: "Collection", href: "/content/app-pages/heroes/collection" },
] as const;

function heroKeyFromPath(pathname: string): PageHeroKey | null {
  const match = pathname.match(/^\/content\/app-pages\/heroes\/([^/]+)/);
  if (!match) return null;
  const key = match[1];
  return PAGE_HERO_KEYS.includes(key as PageHeroKey) ? (key as PageHeroKey) : null;
}

function primaryId(pathname: string): (typeof PRIMARY)[number]["id"] {
  if (pathname.startsWith("/content/app-pages/home")) return "home";
  if (pathname.startsWith("/content/app-pages/events")) return "events";
  if (pathname.startsWith("/content/app-pages/news-blog")) return "news";
  if (pathname.startsWith("/content/app-pages/about")) return "story";
  const heroKey = heroKeyFromPath(pathname);
  if (heroKey === "bespoke") return "bespoke";
  if (heroKey === "shop") return "shop";
  if (heroKey === "contact") return "contact";
  if (heroKey === "cart") return "cart";
  if (heroKey === "collection") return "collection";
  return "home";
}

export function AppPagesTabs() {
  const pathname = usePathname();
  const active = primaryId(pathname);

  return (
    <div className="mb-6">
      <div className="flex justify-start">
        <nav aria-label="App pages" className={adminPillTrackClass}>
          {PRIMARY.map((tab) => {
            const isActive = tab.id === active;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={adminPillClass(isActive, "sm")}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
