import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAnon = createClient(url, anon);
const supabaseAdmin = createClient(url, service);

function normEmail(e: string | null | undefined): string {
  return String(e ?? "")
    .trim()
    .toLowerCase();
}

function metaPhone(u: User): string {
  const m = (u.user_metadata || {}) as Record<string, unknown>;
  return String(m.phone || m.phone_number || m.mobile || "").trim();
}

function displayName(u: User): string {
  const m = (u.user_metadata || {}) as Record<string, unknown>;
  const raw =
    String(m.full_name || m.name || m.display_name || "").trim() ||
    String(m.first_name || "").trim();
  const email = String(u.email || "").trim();
  return raw || (email ? email.split("@")[0] : "—");
}

type UnifiedUserRow = {
  id: string;
  email: string;
  name: string;
  phone: string;
  orderCount: number;
  shopConsultationCount: number;
  portfolioConsultationCount: number;
  newsletterSubscriber: boolean;
  newsletterSubscribedAt: string | null;
  joinedAt: string | null;
  hasAccount: boolean;
};

export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
    if (!token) return NextResponse.json({ error: "Missing auth token" }, { status: 401 });

    const { data: who, error: whoErr } = await supabaseAnon.auth.getUser(token);
    if (whoErr || !who.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allUsers: User[] = [];
    let page = 1;
    for (;;) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const batch = data.users ?? [];
      allUsers.push(...batch);
      if (batch.length < 1000) break;
      page += 1;
    }

    const { data: orderRows, error: oErr } = await supabaseAdmin
      .from("orders")
      .select("user_id, customer_email, customer_phone, created_at");

    if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });

    const { data: consultRows, error: cErr } = await supabaseAdmin
      .from("consultation_bookings")
      .select("user_id, source, customer_email, customer_phone, customer_name, created_at");

    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

    let subRows: { email: string; created_at: string }[] = [];
    const { data: subs, error: sErr } = await supabaseAdmin.from("subscribers").select("email, created_at");
    if (!sErr && subs) {
      subRows = subs as { email: string; created_at: string }[];
    }

    const ordersByUserId = new Map<string, number>();
    const ordersByGuestEmail = new Map<string, number>();
    const phoneFromOrderUid = new Map<string, { at: string; phone: string }>();
    const phoneFromOrderEmail = new Map<string, { at: string; phone: string }>();

    for (const row of orderRows ?? []) {
      const uid = row.user_id as string | null;
      const at = String(row.created_at ?? "");
      const phone = String(row.customer_phone ?? "").trim();
      const em = normEmail(row.customer_email as string);

      if (uid) {
        ordersByUserId.set(uid, (ordersByUserId.get(uid) ?? 0) + 1);
        if (phone) {
          const prev = phoneFromOrderUid.get(uid);
          if (!prev || at > prev.at) phoneFromOrderUid.set(uid, { at, phone });
        }
      } else if (em) {
        ordersByGuestEmail.set(em, (ordersByGuestEmail.get(em) ?? 0) + 1);
        if (phone) {
          const prev = phoneFromOrderEmail.get(em);
          if (!prev || at > prev.at) phoneFromOrderEmail.set(em, { at, phone });
        }
      }
    }

    const shopConsultByUserId = new Map<string, number>();
    const phoneFromShopConsultUid = new Map<string, { at: string; phone: string }>();
    const portfolioConsultByEmail = new Map<string, number>();
    const portfolioMetaByEmail = new Map<string, { at: string; name: string; phone: string }>();

    for (const row of consultRows ?? []) {
      const src = String((row as { source?: string }).source ?? "shop").toLowerCase();
      const at = String(row.created_at ?? "");
      const em = normEmail(row.customer_email as string);
      const phone = String(row.customer_phone ?? "").trim();
      const custName = String((row as { customer_name?: string }).customer_name ?? "").trim();
      const uid = row.user_id as string | null;

      if (src === "portfolio") {
        if (!em) continue;
        portfolioConsultByEmail.set(em, (portfolioConsultByEmail.get(em) ?? 0) + 1);
        const prev = portfolioMetaByEmail.get(em);
        const candidateName = custName || em.split("@")[0];
        if (!prev || at > prev.at) {
          portfolioMetaByEmail.set(em, { at, name: candidateName, phone: phone || prev?.phone || "" });
        } else if (prev && !prev.phone && phone) {
          portfolioMetaByEmail.set(em, { ...prev, phone });
        }
      } else {
        if (uid) {
          shopConsultByUserId.set(uid, (shopConsultByUserId.get(uid) ?? 0) + 1);
          if (phone) {
            const prev = phoneFromShopConsultUid.get(uid);
            if (!prev || at > prev.at) phoneFromShopConsultUid.set(uid, { at, phone });
          }
        }
      }
    }

    const newsletterByEmail = new Map<string, string>();
    for (const s of subRows) {
      const e = normEmail(s.email);
      if (!e) continue;
      const prev = newsletterByEmail.get(e);
      const t = String(s.created_at ?? "");
      if (!prev || t < prev) newsletterByEmail.set(e, t);
    }

    const rows: UnifiedUserRow[] = [];
    const accountEmails = new Set<string>();

    for (const u of allUsers) {
      const emailRaw = String(u.email ?? "").trim();
      const em = normEmail(emailRaw);
      if (!em) continue;
      accountEmails.add(em);

      const id = u.id;
      const metaP = metaPhone(u);
      const oP = phoneFromOrderUid.get(id)?.phone ?? "";
      const scP = phoneFromShopConsultUid.get(id)?.phone ?? "";
      const portP = portfolioMetaByEmail.get(em)?.phone ?? "";
      const phone = metaP || oP || scP || portP || phoneFromOrderEmail.get(em)?.phone || "—";

      const orderCount = (ordersByUserId.get(id) ?? 0) + (ordersByGuestEmail.get(em) ?? 0);
      const shopConsultationCount = shopConsultByUserId.get(id) ?? 0;
      const portfolioConsultationCount = portfolioConsultByEmail.get(em) ?? 0;
      const subAt = newsletterByEmail.get(em) ?? null;

      let name = displayName(u);
      const pm = portfolioMetaByEmail.get(em);
      if ((!name || name === em.split("@")[0]) && pm?.name) name = pm.name;

      rows.push({
        id,
        email: emailRaw,
        name,
        phone,
        orderCount,
        shopConsultationCount,
        portfolioConsultationCount,
        newsletterSubscriber: !!subAt,
        newsletterSubscribedAt: subAt,
        joinedAt: u.created_at ?? null,
        hasAccount: true,
      });
    }

    const extraEmails = new Set<string>();
    for (const em of portfolioConsultByEmail.keys()) {
      if (!accountEmails.has(em)) extraEmails.add(em);
    }
    for (const em of newsletterByEmail.keys()) {
      if (!accountEmails.has(em)) extraEmails.add(em);
    }
    for (const em of ordersByGuestEmail.keys()) {
      if (!accountEmails.has(em)) extraEmails.add(em);
    }

    for (const em of extraEmails) {
      const pm = portfolioMetaByEmail.get(em);
      const subAt = newsletterByEmail.get(em) ?? null;
      const orderCount = ordersByGuestEmail.get(em) ?? 0;
      const portfolioConsultationCount = portfolioConsultByEmail.get(em) ?? 0;
      const name = pm?.name || em.split("@")[0];
      const phone = pm?.phone || phoneFromOrderEmail.get(em)?.phone || "—";

      let joinedAt: string | null = subAt;
      if (pm?.at && (!joinedAt || pm.at < joinedAt)) joinedAt = pm.at;

      rows.push({
        id: `email:${em}`,
        email: em,
        name,
        phone,
        orderCount,
        shopConsultationCount: 0,
        portfolioConsultationCount,
        newsletterSubscriber: !!subAt,
        newsletterSubscribedAt: subAt,
        joinedAt,
        hasAccount: false,
      });
    }

    rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

    return NextResponse.json({ users: rows });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
