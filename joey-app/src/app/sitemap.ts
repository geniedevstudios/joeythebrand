import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { getPublicSiteUrl } from "@/lib/emailAssets";

export const dynamic = "force-dynamic";

type DatedSlug = {
  slug: string | null;
  id?: string;
  created_at?: string | null;
  updated_at?: string | null;
};

function lastMod(row: DatedSlug, fallback: Date): Date {
  const raw = row.updated_at || row.created_at;
  if (!raw) return fallback;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getPublicSiteUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${site}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${site}/shop`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${site}/events`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${site}/collection`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${site}/story`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${site}/bespoke`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${site}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    { url: `${site}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${site}/shipping`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return staticEntries;

  const supabase = createClient(url, key);

  const [eventsRes, productsRes, collectionsRes] = await Promise.all([
    supabase.from("events").select("slug,created_at,updated_at").not("slug", "is", null),
    supabase
      .from("products")
      .select("slug,id,created_at")
      .or(
        "is_published.eq.true,and(fulfillment_mode.eq.made_to_order_only,show_on_bespoke_page.eq.true)",
      ),
    supabase.from("collections").select("slug,created_at").not("slug", "is", null),
  ]);

  const dynamicEntries: MetadataRoute.Sitemap = [];

  if (!eventsRes.error && eventsRes.data) {
    for (const r of eventsRes.data as DatedSlug[]) {
      const slug = (r.slug ?? "").trim();
      if (!slug) continue;
      dynamicEntries.push({
        url: `${site}/events/${encodeURIComponent(slug)}`,
        lastModified: lastMod(r, now),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  if (!productsRes.error && productsRes.data) {
    for (const r of productsRes.data as DatedSlug[]) {
      const slug = (r.slug ?? "").trim();
      const id = String(r.id || "").trim();
      const path = slug || id;
      if (!path) continue;
      dynamicEntries.push({
        url: `${site}/shop/${encodeURIComponent(path)}`,
        lastModified: lastMod(r, now),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  if (!collectionsRes.error && collectionsRes.data) {
    for (const r of collectionsRes.data as DatedSlug[]) {
      const slug = (r.slug ?? "").trim();
      if (!slug) continue;
      dynamicEntries.push({
        url: `${site}/collection/${encodeURIComponent(slug)}`,
        lastModified: lastMod(r, now),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  return [...staticEntries, ...dynamicEntries];
}
