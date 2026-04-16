/**
 * Poster image URL to show while an MP4 loads (home hero, /events top video, event detail).
 * Returns "" if missing or if poster was mistakenly set to the same URL as the video.
 */
export function usableVideoPoster(
  videoSrc: string | undefined,
  posterCandidate: string | undefined,
): string {
  const v = (videoSrc ?? "").trim();
  const p = (posterCandidate ?? "").trim();
  if (!v || !p) return "";
  if (p === v) return "";
  return p;
}
