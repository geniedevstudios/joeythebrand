import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { isPrimaryAdminEmail, PRIMARY_ADMIN_EMAIL } from "@/lib/adminPrimary";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAnon = createClient(url, anon);
const supabaseAdmin = createClient(url, service);

function displayName(u: User): string {
  const m = (u.user_metadata || {}) as Record<string, unknown>;
  const raw =
    String(m.full_name || m.name || m.display_name || "").trim() ||
    String(m.first_name || "").trim();
  const email = String(u.email || "").trim();
  return raw || (email ? email.split("@")[0] : "—");
}

/** Dashboard operators (same table as RLS `supabase_admin_team_rls.sql`). */
export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
    if (!token) return NextResponse.json({ error: "Missing auth token" }, { status: 401 });

    const { data: who, error: whoErr } = await supabaseAnon.auth.getUser(token);
    if (whoErr || !who.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isPrimaryAdminEmail(who.user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: rows, error: tblErr } = await supabaseAdmin.from("admin_operator_emails").select("email");
    if (tblErr) {
      console.error("[admin/team] admin_operator_emails:", tblErr.message);
      return NextResponse.json(
        {
          error:
            "Team table not found. Run supabase_admin_team_rls.sql in Supabase SQL Editor, then try again.",
        },
        { status: 503 },
      );
    }

    const emails = new Set(
      (rows ?? []).map((r: { email: string }) => String(r.email || "").trim().toLowerCase()).filter(Boolean),
    );
    if (!emails.has(PRIMARY_ADMIN_EMAIL)) {
      emails.add(PRIMARY_ADMIN_EMAIL);
    }

    const allAuth: User[] = [];
    let page = 1;
    for (;;) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const batch = data.users ?? [];
      allAuth.push(...batch);
      if (batch.length < 1000) break;
      page += 1;
    }

    const byEmail = new Map<string, User>();
    for (const u of allAuth) {
      const em = String(u.email ?? "")
        .trim()
        .toLowerCase();
      if (em) byEmail.set(em, u);
    }

    const members = [...emails].sort((a, b) => a.localeCompare(b)).map((email) => {
      const u = byEmail.get(email);
      return {
        email,
        userId: u?.id ?? null,
        name: u ? displayName(u) : "—",
        isPrimary: email === PRIMARY_ADMIN_EMAIL,
      };
    });

    return NextResponse.json({ members });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
    if (!token) return NextResponse.json({ error: "Missing auth token" }, { status: 401 });

    const { data: who, error: whoErr } = await supabaseAnon.auth.getUser(token);
    if (whoErr || !who.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isPrimaryAdminEmail(who.user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json()) as { email?: string };
    const raw = String(body.email ?? "").trim().toLowerCase();
    if (!raw) return NextResponse.json({ error: "email is required" }, { status: 400 });
    if (raw === PRIMARY_ADMIN_EMAIL) {
      return NextResponse.json({ error: "Cannot remove the primary admin account." }, { status: 400 });
    }

    const { data: rows, error: tblErr } = await supabaseAdmin.from("admin_operator_emails").select("email");
    if (tblErr) {
      return NextResponse.json({ error: tblErr.message }, { status: 503 });
    }

    const allowed = new Set(
      (rows ?? []).map((r: { email: string }) => String(r.email || "").trim().toLowerCase()),
    );
    if (!allowed.has(raw)) {
      return NextResponse.json({ error: "That email is not listed as a dashboard operator." }, { status: 400 });
    }

    let userId: string | null = null;
    let page = 1;
    for (;;) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const batch = data.users ?? [];
      const hit = batch.find((u) => String(u.email ?? "").trim().toLowerCase() === raw);
      if (hit) {
        userId = hit.id;
        break;
      }
      if (batch.length < 1000) break;
      page += 1;
    }

    if (userId) {
      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 });
    }

    const { error: rmErr } = await supabaseAdmin.from("admin_operator_emails").delete().eq("email", raw);
    if (rmErr) return NextResponse.json({ error: rmErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
