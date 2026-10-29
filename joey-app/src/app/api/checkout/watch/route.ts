import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { markCheckoutStarted } from "@/lib/unpaidCheckout";

export const runtime = "nodejs";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function getSupabaseAnon() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";
    if (!token) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const { data: who, error } = await getSupabaseAnon().auth.getUser(token);
    if (error || !who?.user?.id) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    await markCheckoutStarted({
      supabaseAdmin: getSupabaseAdmin(),
      userId: who.user.id,
      items: [],
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Checkout watch failed:", err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
