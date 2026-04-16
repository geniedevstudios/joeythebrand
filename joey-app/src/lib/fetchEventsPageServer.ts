import { createClient } from "@supabase/supabase-js";

export type EventsPageContent = {
  heading: string;
  subheading?: string;
  body?: string;
  topVideoUrl?: string;
  /** Still image shown while `topVideoUrl` loads on /events */
  topVideoPosterUrl?: string;
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
    .select("heading, subheading, body, top_video_url, top_video_poster_url, updated_at")
    .maybeSingle();

  if (error || !data) return null;

  return {
    heading: String((data as any).heading ?? "").trim() || "Events",
    subheading: (data as any).subheading ? String((data as any).subheading).trim() : undefined,
    body: (data as any).body ? String((data as any).body).trim() : undefined,
    topVideoUrl: (data as any).top_video_url ? String((data as any).top_video_url).trim() : undefined,
    topVideoPosterUrl: (data as any).top_video_poster_url
      ? String((data as any).top_video_poster_url).trim()
      : undefined,
    updatedAt: (data as any).updated_at ? String((data as any).updated_at) : undefined,
  };
}

