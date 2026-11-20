import { supabase } from "./supabase";

import { IMAGE_UPLOAD_LIMIT, VIDEO_UPLOAD_LIMIT, type MediaUpload } from "./mediaUpload";

/**
 * Upload a file directly to the configured media bucket and return its public URL.
 * The admin must be signed in. The signing secret stays on the server.
 */
export async function uploadSiteAsset(file: File, folder: string): Promise<string> {
  const resourceType = file.type.startsWith("video/") ? "video" : "image";
  const limit = resourceType === "video" ? VIDEO_UPLOAD_LIMIT : IMAGE_UPLOAD_LIMIT;
  if (file.size > limit) {
    throw new Error(resourceType === "video" ? "Videos need to be 50MB or smaller." : "Images need to be 15MB or smaller.");
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Sign in again before uploading.");

  const signResponse = await fetch("/api/media/sign", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ folder, resourceType, contentType: file.type, size: file.size }),
  });
  const sign = await signResponse.json().catch(() => null) as (MediaUpload & { error?: string }) | null;
  if (!signResponse.ok || !sign) {
    throw new Error(sign?.error || "Upload could not start.");
  }

  if (sign.provider === "r2" && sign.uploadUrl && sign.publicUrl) {
    let uploaded: Response;
    try {
      uploaded = await fetch(sign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
    } catch {
      throw new Error("Could not reach R2. Check your connection and the bucket’s allowed upload origins.");
    }
    if (!uploaded.ok) throw new Error("R2 could not store that file. Try uploading it again.");
    return sign.publicUrl;
  }
  throw new Error("Upload could not start.");
}
