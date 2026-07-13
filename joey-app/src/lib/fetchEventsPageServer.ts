import { createClient } from "@supabase/supabase-js";

export type EventsPageContent = {
  heading: string;
  subheading?: string;
  body?: string;
  topVideoUrl?: string;
  topVideoPosterUrl?: string;
  topVideoTabletUrl?: string;
  topVideoTabletPosterUrl?: string;
  topVideoMobileUrl?: string;
  topVideoMobilePosterUrl?: string;
  updatedAt?: string;
};

/**
 * Reads events page content from Supabase.
 *
 * Expected table (public): `events_page`
 * Expected columns: `heading`, `subheading`, `body`, `top_video_url`, `top_video_poster_url`, `updated_at`
 *
 * If the table/row doesn't exist yet, returns null and the UI falls back to defaults.
 */
export async function fetchEventsPageContent(): Promise<EventsPageContent | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("events_page")
    .select("heading, subheading, body, top_video_url, top_video_poster_url, top_video_tablet_url, top_video_tablet_poster_url, top_video_mobile_url, top_video_mobile_poster_url, updated_at")
    .maybeSingle();

  if (error || !data) return null;

  const row = data as Record<string, unknown>;
  return {
    heading: String(row.heading ?? "").trim() || "Events",
    subheading: row.subheading ? String(row.subheading).trim() : undefined,
    body: row.body ? String(row.body).trim() : undefined,
    topVideoUrl: row.top_video_url ? String(row.top_video_url).trim() : undefined,
    topVideoPosterUrl: row.top_video_poster_url ? String(row.top_video_poster_url).trim() : undefined,
    topVideoTabletUrl: row.top_video_tablet_url ? String(row.top_video_tablet_url).trim() : undefined,
    topVideoTabletPosterUrl: row.top_video_tablet_poster_url ? String(row.top_video_tablet_poster_url).trim() : undefined,
    topVideoMobileUrl: row.top_video_mobile_url ? String(row.top_video_mobile_url).trim() : undefined,
    topVideoMobilePosterUrl: row.top_video_mobile_poster_url ? String(row.top_video_mobile_poster_url).trim() : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

