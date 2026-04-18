import { createClient } from "@supabase/supabase-js";
import type { PublicCollection } from "./types";
import { mapPublicCollectionFromSupabaseRow } from "./dataStore";

/**
 * Load `collections` on the server so home/shop sections can render real images on first paint
 * (avoids a flash of stale SSR data before the client dataStore refreshes).
 */
export async function fetchCollectionsForHome(): Promise<PublicCollection[] | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) return null;
  return (data as Record<string, unknown>[]).map(mapPublicCollectionFromSupabaseRow);
}

