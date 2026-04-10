import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/* ── Brevo Sync ── */
async function syncWithBrevo(email: string) {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) return;

  let listId = Number(process.env.BREVO_SUBSCRIBE_LIST_ID?.trim());
  if (!Number.isFinite(listId) || listId < 1) listId = 3;

  try {
    await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        email,
        listIds: [listId],
        updateEnabled: true,
      }),
    });
  } catch (err) {
    console.error("[brevo sync error]", err);
  }
}

function json(status: number, body: { ok: boolean; message: string }) {
  return NextResponse.json(body, { status });
}

export async function POST(req: Request) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(503, {
      ok: false,
      message: "Newsletter is not configured yet.",
    });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json(400, { ok: false, message: "Invalid JSON." });
  }

  const email = typeof (payload as { email?: unknown })?.email === "string" ? (payload as { email: string }).email.trim() : "";
  if (!email) return json(400, { ok: false, message: "Email is required." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { ok: false, message: "Please enter a valid email." });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase.from("subscribers").insert({ email });

  // If the row already exists, treat it as a success.
  const isUniqueViolation =
    (error as { code?: string } | null)?.code === "23505" ||
    /duplicate key|already exists|unique/i.test((error as { message?: string } | null)?.message ?? "");

  if (error && !isUniqueViolation) {
    return json(500, { ok: false, message: "Could not subscribe right now." });
  }

  // Also push to Brevo so it's globally synced with JOEY admin
  void syncWithBrevo(email);

  return json(200, { ok: true, message: "Subscribed." });
}

