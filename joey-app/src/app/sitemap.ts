import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const SITE_URL = "https://joeythebrand.com";

type EventRow = { slug: string | null; updated_at?: string | null };
type ProductRow = { slug: string | null; id: string; updated_at?: string | null };
type CollectionRow = { slug: string | null; updated_at?: string | null };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/shop`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/events`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/collection`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/story`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/bespoke`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/shipping`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return staticEntries;

  const supabase = createClient(url, key);

  const [eventsRes, productsRes, collectionsRes] = await Promise.all([
    supabase.from("events").select("slug,updated_at").not("slug", "is", null),
    supabase.from("products").select("slug,id,updated_at"),
    supabase.from("collections").select("slug,updated_at").not("slug", "is", null),
  ]);

  const dynamicEntries: MetadataRoute.Sitemap = [];

  if (!eventsRes.error && eventsRes.data) {
    for (const r of eventsRes.data as unknown as EventRow[]) {
      const slug = (r.slug ?? "").trim();
      if (!slug) continue;
      dynamicEntries.push({
        url: `${SITE_URL}/events/${encodeURIComponent(slug)}`,
        lastModified: r.updated_at ? new Date(r.updated_at) : now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  if (!productsRes.error && productsRes.data) {
    for (const r of productsRes.data as unknown as ProductRow[]) {
      const slug = (r.slug ?? "").trim();
      const id = String(r.id || "").trim();
      const path = slug ? slug : id;
      if (!path) continue;
      dynamicEntries.push({
        url: `${SITE_URL}/shop/${encodeURIComponent(path)}`,
        lastModified: r.updated_at ? new Date(r.updated_at) : now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  if (!collectionsRes.error && collectionsRes.data) {
    for (const r of collectionsRes.data as unknown as CollectionRow[]) {
      const slug = (r.slug ?? "").trim();
      if (!slug) continue;
      dynamicEntries.push({
        url: `${SITE_URL}/collection/${encodeURIComponent(slug)}`,
        lastModified: r.updated_at ? new Date(r.updated_at) : now,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  return [...staticEntries, ...dynamicEntries];
}
