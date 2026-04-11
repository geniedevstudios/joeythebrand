import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const BREVO_CONTACTS = "https://api.brevo.com/v3/contacts";

function json(
  status: number,
  body: { ok: boolean; message?: string; alreadySubscribed?: boolean },
) {
  return NextResponse.json(body, { status });
}

function parseListIds(): number[] {
  const raw = process.env.BREVO_SUBSCRIBE_LIST_ID?.trim() ?? "3";
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return [3];
  return [n];
}

/** GET /contacts/{email} — used when only Brevo is configured (no Supabase dedupe). */
async function brevoGetContactStatus(
  email: string,
  apiKey: string,
): Promise<"exists" | "absent" | "auth_error" | "error"> {
  const res = await fetch(`${BREVO_CONTACTS}/${encodeURIComponent(email)}`, {
    method: "GET",
    headers: { accept: "application/json", "api-key": apiKey },
  });
  if (res.status === 404) return "absent";
  if (res.ok) return "exists";
  if (res.status === 401 || res.status === 403) return "auth_error";
  return "error";
}

/** Create or update contact and add to list(s). */
async function brevoUpsertContact(email: string, apiKey: string, listIds: number[]): Promise<{ ok: true } | { ok: false; detail: string }> {
  const res = await fetch(BREVO_CONTACTS, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      email,
      listIds,
      updateEnabled: true,
    }),
  });

  const text = await res.text();
  if (res.ok || res.status === 204) return { ok: true };

  try {
    const err = JSON.parse(text) as { code?: string; message?: string };
    const msg = `${err.code ?? ""} ${err.message ?? ""}`.toLowerCase();
    if (msg.includes("duplicate") || err.code === "duplicate_parameter") {
      return { ok: true };
    }
  } catch {
    /* ignore */
  }

  console.error("[subscribe] Brevo POST failed:", res.status, text.slice(0, 500));
  return { ok: false, detail: text.slice(0, 200) };
}

export async function POST(req: Request) {
  const brevoKey = process.env.BREVO_API_KEY?.trim();
  /** Same as joey-app: `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. */
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const hasBrevo = Boolean(brevoKey);
  const hasSupabase = Boolean(supabaseUrl && supabaseKey);

  if (!hasBrevo && !hasSupabase) {
    return json(503, {
      ok: false,
      message: "Subscription is temporarily unavailable.",
    });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json(400, { ok: false, message: "Invalid request." });
  }

  const raw =
    typeof (payload as { email?: unknown })?.email === "string"
      ? (payload as { email: string }).email.trim().toLowerCase()
      : "";
  if (!raw) return json(400, { ok: false, message: "Email is required." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
    return json(400, { ok: false, message: "Please enter a valid email." });
  }

  const email = raw;
  const listIds = parseListIds();

  if (hasSupabase) {
    const supabase = createClient(supabaseUrl!, supabaseKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await supabase.from("subscribers").insert({ email });

    const isUniqueViolation =
      (error as { code?: string } | null)?.code === "23505" ||
      /duplicate key|already exists|unique/i.test((error as { message?: string } | null)?.message ?? "");

    if (error && !isUniqueViolation) {
      console.error("[subscribe] Supabase insert:", error);
      return json(500, { ok: false, message: "Could not save subscription." });
    }

    if (isUniqueViolation) {
      if (hasBrevo) void brevoUpsertContact(email, brevoKey!, listIds);
      return json(200, {
        ok: true,
        alreadySubscribed: true,
        message: "Already subscribed.",
      });
    }

    if (hasBrevo) {
      const brevo = await brevoUpsertContact(email, brevoKey!, listIds);
      if (!brevo.ok) {
        return json(502, {
          ok: false,
          message: "Could not sync with the mailing list. Please try again.",
        });
      }
    }

    return json(200, {
      ok: true,
      alreadySubscribed: false,
      message: "Subscribed.",
    });
  }

  /* Brevo only (no Supabase) */
  const status = await brevoGetContactStatus(email, brevoKey!);
  if (status === "exists") {
    return json(200, {
      ok: true,
      alreadySubscribed: true,
      message: "Already subscribed.",
    });
  }
  if (status === "auth_error") {
    return json(503, {
      ok: false,
      message: "Mailing list could not be reached. Check BREVO_API_KEY.",
    });
  }

  const brevo = await brevoUpsertContact(email, brevoKey!, listIds);
  if (!brevo.ok) {
    return json(502, {
      ok: false,
      message: "Could not add you to the list. Please try again.",
    });
  }

  return json(200, {
    ok: true,
    alreadySubscribed: false,
    message: "Subscribed.",
  });
}
