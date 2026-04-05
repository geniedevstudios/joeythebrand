import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

export async function getUserFromBearer(request: Request): Promise<User | null> {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) return null;

  const supabase = createClient(url, anon);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

/**
 * Optional comma-separated allowlist (lowercase). If unset, any signed-in admin user may send.
 */
export function isNewsletterSenderAllowed(userEmail: string | undefined): boolean {
  const raw = process.env.ADMIN_NEWSLETTER_EMAILS?.trim();
  if (!raw) return true;
  if (!userEmail) return false;
  const set = new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  return set.has(userEmail.toLowerCase());
}
