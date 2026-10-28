import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    return NextResponse.json({ products: [] }, { status: 200 });
  }

  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .or(
        "is_published.eq.true,and(fulfillment_mode.eq.made_to_order_only,show_on_bespoke_page.eq.true)",
      )
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ products: [], error: error.message }, { status: 500 });
    }

    return NextResponse.json({ products: data || [] }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { products: [], error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
