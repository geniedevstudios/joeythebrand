import { supabase } from "./supabase";

export const SITE_ASSETS_BUCKET = "site-assets";

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
}

/**
 * Upload a file to the public `site-assets` bucket and return its public URL.
 * Requires Storage setup (see supabase_storage_site_assets.sql) and admin sign-in.
 */
export async function uploadSiteAsset(file: File, folder: string): Promise<string> {
  const path = `${folder.replace(/^\/+|\/+$/g, "")}/${Date.now()}-${safeFileName(file.name)}`;

  const { error } = await supabase.storage.from(SITE_ASSETS_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(SITE_ASSETS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
