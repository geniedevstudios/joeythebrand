/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";

export type EventCategory = "fashion_shows" | "clan_festival";
export type EventStatus = "upcoming" | "past";

type EventRow = Record<string, unknown>;

function normalizeCollectionSlugs(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((s) => String(s)).map((s) => s.trim()).filter(Boolean);
  if (typeof v === "string") {
    // Accept "a,b", "{a,b}", or "a, b" (some older setups can serialize arrays as strings)
    const t = v.trim().replace(/^\{/, "").replace(/\}$/, "");
    if (!t) return [];
    return t
      .split(",")
      .map((s) => String(s).trim())
      .filter(Boolean);
  }
  return [];
}

export type PublicEvent = {
  id: string;
  slug: string;
  title: string;
  category: EventCategory;
  status: EventStatus;
  location?: string;
  startAt?: string;
  dateLabel?: string;
  description?: string;
  /** Flyer image for event cards (background). */
  flyerUrl?: string;
  /** MP4 show video for the event page / "Watch show" action. */
  mainVideoUrl?: string;
  /** Optional still shown while main show video loads (falls back to flyer on site). */
  mainVideoPosterUrl?: string;
  /** Gallery images for the event detail page. */
  galleryUrls: string[];
  /** Opens YouTube in new tab. */
  recapYoutubeUrl?: string;
  /** Opens Pixieset in new tab. */
  pixiesetUrl?: string;
  /** Slugs under /collection/[slug]. */
  collectionSlugs: string[];
  /** If true, show details content in popup; else show newsletter CTA. */
  detailsReady: boolean;
  details?: string;
  sortOrder: number;
};

export async function fetchPublicEvents(): Promise<PublicEvent[] | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, slug, title, category, status, location, start_at, date_label, description, details_ready, details, main_video_url, main_video_poster_url, flyer_url, gallery_urls, recap_youtube_url, pixieset_url, collection_slugs, sort_order",
    )
    .order("status", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("start_at", { ascending: true })
    .order("created_at", { ascending: false });

  if (error || !data) return null;

  return (data as EventRow[]).map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    category: row.category === "clan_festival" ? "clan_festival" : "fashion_shows",
    status: row.status === "past" ? "past" : "upcoming",
    location: row.location ? String(row.location) : undefined,
    startAt: row.start_at ? String(row.start_at) : undefined,
    dateLabel: row.date_label ? String(row.date_label) : undefined,
    description: row.description ? String(row.description) : undefined,
    flyerUrl: row.flyer_url ? String(row.flyer_url) : undefined,
    mainVideoUrl: row.main_video_url ? String(row.main_video_url) : undefined,
    mainVideoPosterUrl: row.main_video_poster_url ? String(row.main_video_poster_url) : undefined,
    galleryUrls: Array.isArray(row.gallery_urls)
      ? row.gallery_urls.map((x) => String(x)).filter(Boolean)
      : [],
    recapYoutubeUrl: row.recap_youtube_url ? String(row.recap_youtube_url) : undefined,
    pixiesetUrl: row.pixieset_url ? String(row.pixieset_url) : undefined,
    collectionSlugs: normalizeCollectionSlugs(row.collection_slugs),
    detailsReady: Boolean(row.details_ready),
    details: row.details ? String(row.details) : undefined,
    sortOrder: Number(row.sort_order ?? 0),
  }));
}

export async function fetchPublicEventBySlug(slug: string): Promise<PublicEvent | null | undefined> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("[fetchPublicEventBySlug] Missing Supabase environment variables.");
    return undefined;
  }

  // Normalize slug: decode (for encoded URLs) and lowercase (matching sanitized DB slugs)
  let s = "";
  try {
    s = decodeURIComponent(String(slug || "").trim()).toLowerCase();
  } catch {
    s = String(slug || "").trim().toLowerCase();
  }

  if (!s) return null;

  // We'll use a shared fetch with a longer timeout for slow connections
  const maxRetries = 5;
  const timeoutMs = 15000; // 15 seconds per attempt

  let lastError: any = null;

  for (let i = 0; i < maxRetries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const supabase = createClient(url, key, {
        global: {
          fetch: (url, options) => fetch(url, { ...options, signal: controller.signal }),
        },
      });

      const { data, error } = await supabase
        .from("events")
        .select(
          "id, slug, title, category, status, location, start_at, date_label, description, details_ready, details, main_video_url, main_video_poster_url, flyer_url, gallery_urls, recap_youtube_url, pixieset_url, collection_slugs, sort_order",
        )
        .eq("slug", s)
        .maybeSingle();

      clearTimeout(timeoutId);

      if (error) {
        lastError = error;
        // If it's a network/timeout error, we retry.
        if (i < maxRetries - 1) {
          const delay = 1000 * (i + 1); // Progressive backoff: 1s, 2s, 3s, 4s...
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        break;
      }

      if (!data) return null; // Genuinely not found in DB

      const row = data as EventRow;
      return {
        id: String(row.id),
        slug: String(row.slug),
        title: String(row.title),
        category: row.category === "clan_festival" ? "clan_festival" : "fashion_shows",
        status: row.status === "past" ? "past" : "upcoming",
        location: row.location ? String(row.location) : undefined,
        startAt: row.start_at ? String(row.start_at) : undefined,
        dateLabel: row.date_label ? String(row.date_label) : undefined,
        description: row.description ? String(row.description) : undefined,
        flyerUrl: row.flyer_url ? String(row.flyer_url) : undefined,
        mainVideoUrl: row.main_video_url ? String(row.main_video_url) : undefined,
        mainVideoPosterUrl: row.main_video_poster_url ? String(row.main_video_poster_url) : undefined,
        galleryUrls: Array.isArray(row.gallery_urls) ? row.gallery_urls.map((x) => String(x)).filter(Boolean) : [],
        recapYoutubeUrl: row.recap_youtube_url ? String(row.recap_youtube_url) : undefined,
        pixiesetUrl: row.pixieset_url ? String(row.pixieset_url) : undefined,
        collectionSlugs: Array.isArray(row.collection_slugs)
          ? row.collection_slugs.map((x) => String(x)).filter(Boolean)
          : [],
        detailsReady: Boolean(row.details_ready),
        details: row.details ? String(row.details) : undefined,
        sortOrder: Number(row.sort_order ?? 0),
      };
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      if (i < maxRetries - 1) {
        const delay = 1000 * (i + 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  // If we reach here, we failed after retries
  console.error(`[fetchPublicEventBySlug] Failed to fetch event for slug "${s}" after ${maxRetries} attempts:`, lastError);
  return undefined; // Indicates a system error, not necessarily "not found"
}

