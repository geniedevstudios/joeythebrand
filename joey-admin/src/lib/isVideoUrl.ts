/** True when URL looks like an inline video asset (product main media, order line thumbnails). */
export function isVideoUrl(url: string): boolean {
  const u = String(url || "").trim().toLowerCase();
  return /\.(mp4|webm|mov)(\?|#|$)/i.test(u);
}
