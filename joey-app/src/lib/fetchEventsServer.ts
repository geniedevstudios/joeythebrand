import { createClient } from "@supabase/supabase-js";

export type EventCategory = "fashion_shows" | "clan_festival";
export type EventStatus = "upcoming" | "past";

type EventRow = Record<string, unknown>;

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
    collectionSlugs: Array.isArray(row.collection_slugs)
      ? row.collection_slugs.map((s) => String(s)).filter(Boolean)
      : [],
    detailsReady: Boolean(row.details_ready),
    details: row.details ? String(row.details) : undefined,
    sortOrder: Number(row.sort_order ?? 0),
  }));
}

export async function fetchPublicEventBySlug(slug: string): Promise<PublicEvent | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const s = String(slug || "").trim();
  if (!s) return null;

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, slug, title, category, status, location, start_at, date_label, description, details_ready, details, main_video_url, main_video_poster_url, flyer_url, gallery_urls, recap_youtube_url, pixieset_url, collection_slugs, sort_order",
    )
    .eq("slug", s)
    .maybeSingle();

  if (error || !data) return null;

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
}

