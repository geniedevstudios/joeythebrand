/** Newsletter subscribe: 10 POSTs / 15 min / IP (separate bucket from contact form). */

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX = 10;

export function subscribeRateLimitConsume(ip: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  let b = store.get(ip);
  if (!b || now >= b.resetAt) {
    b = { count: 1, resetAt: now + WINDOW_MS };
    store.set(ip, b);
    return { ok: true };
  }
  if (b.count >= MAX) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  b.count += 1;
  return { ok: true };
}
