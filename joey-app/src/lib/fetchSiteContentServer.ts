import { createClient } from "@supabase/supabase-js";
import type { SiteContent } from "./types";
import { mapSiteContentFromSupabaseRow } from "./dataStore";

/** Full `site_content` row for SSR (news page, home hero, etc.). */
export async function fetchSiteContent(): Promise<SiteContent | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key);
  const { data, error } = await supabase.from("site_content").select("*").maybeSingle();

  if (error || !data) return null;
  return mapSiteContentFromSupabaseRow(data as Record<string, unknown>);
}

/**
 * Load `site_content` on the server so the home hero can render the real media on first paint
 * (avoids a flash of bundled defaults before `dataStore.init()` runs in the browser).
 */
export async function fetchSiteContentForHome(): Promise<SiteContent | null> {
  return fetchSiteContent();
}
