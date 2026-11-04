import { supabase } from "./supabase";

const IMAGE_LIMIT = 15 * 1024 * 1024;
const VIDEO_LIMIT = 50 * 1024 * 1024;

/**
 * Upload a file straight to Cloudinary and return its public URL.
 * The admin must be signed in. The signing secret stays on the server.
 */
export async function uploadSiteAsset(file: File, folder: string): Promise<string> {
  const resourceType = file.type.startsWith("video/") ? "video" : "image";
  const limit = resourceType === "video" ? VIDEO_LIMIT : IMAGE_LIMIT;
  if (file.size > limit) {
    throw new Error(resourceType === "video" ? "Videos need to be 50MB or smaller." : "Images need to be 15MB or smaller.");
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Sign in again before uploading.");

  const signResponse = await fetch("/api/media/sign", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ folder, resourceType }),
  });
  const sign = await signResponse.json().catch(() => ({}));
  if (!signResponse.ok || !sign.signature || !sign.cloudName) {
    throw new Error(typeof sign.error === "string" ? sign.error : "Upload could not start.");
  }

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sign.apiKey);
  form.append("timestamp", String(sign.timestamp));
  form.append("folder", sign.folder);
  form.append("public_id", sign.publicId);
  form.append("signature", sign.signature);

  const uploaded = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/${sign.resourceType}/upload`, {
    method: "POST",
    body: form,
  });
  const body = await uploaded.json().catch(() => ({}));
  if (!uploaded.ok || typeof body.secure_url !== "string") {
    throw new Error("Cloudinary could not store that file.");
  }
  return body.secure_url;
}
