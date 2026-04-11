import { NextResponse } from "next/server";
import { isValidEmail } from "@/lib/contactPayload";
import { getClientIp } from "@/lib/contactRateLimit";
import { subscribeRateLimitConsume } from "@/lib/subscribeRateLimit";
import { createServiceRoleSupabase } from "@/lib/supabaseService";
import { addToAllUpdates } from "@/services/brevo.service";

function sanitizeSubscribeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (!email || email.length > 320 || !isValidEmail(email)) return null;
  return email;
}

export async function postSubscribe(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const email = sanitizeSubscribeEmail((body as { email?: unknown }).email);
  if (!email) {
    return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
  }

  const ip = getClientIp(request);
  const limited = subscribeRateLimitConsume(ip);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests", retryAfterSeconds: limited.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const supabase = createServiceRoleSupabase();
  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        error: "Subscription is not configured. Add SUPABASE_SERVICE_ROLE_KEY on the server.",
      },
      { status: 503 },
    );
  }

  const { error } = await supabase.from("subscribers").insert({ email });

  if (error) {
    if (error.code === "23505") {
      // unique_violation — already subscribed; still try Brevo in case they were only in DB
      void addToAllUpdates(email);
      return NextResponse.json(
        {
          ok: true,
          alreadySubscribed: true,
          message: "You’re already subscribed to the list.",
        },
        { status: 200 },
      );
    }
    console.error("[subscribe] Supabase insert:", error);
    return NextResponse.json({ ok: false, error: "Could not save subscription." }, { status: 500 });
  }

  void addToAllUpdates(email);

  return NextResponse.json({ ok: true, message: "Subscribed." }, { status: 200 });
}
