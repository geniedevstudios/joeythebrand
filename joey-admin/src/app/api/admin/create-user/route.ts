import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAnon = createClient(url, anon);
const supabaseAdmin = createClient(url, service);

const ADMIN_EMAIL_ALLOWLIST = [
  "joeythebrandonline@gmail.com",
].map((s) => s.toLowerCase());

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
    if (!token) return NextResponse.json({ error: "Missing auth token" }, { status: 401 });

    const { data: who, error: whoErr } = await supabaseAnon.auth.getUser(token);
    if (whoErr || !who.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const requesterEmail = String(who.user.email).toLowerCase();
    if (!ADMIN_EMAIL_ALLOWLIST.includes(requesterEmail)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json()) as { name?: string; email?: string; password?: string };
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: name ? { full_name: name } : undefined,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, userId: data.user?.id });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

