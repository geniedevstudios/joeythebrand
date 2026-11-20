export const MEDIA_TYPES: Readonly<Partial<Record<string, string>>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

export const IMAGE_UPLOAD_LIMIT = 15 * 1024 * 1024;
export const VIDEO_UPLOAD_LIMIT = 50 * 1024 * 1024;

export type MediaUpload = { provider: "r2"; uploadUrl: string; publicUrl: string };
