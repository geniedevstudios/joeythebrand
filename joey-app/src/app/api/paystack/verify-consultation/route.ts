import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ error: "Paystack is not configured." }, { status: 500 });
    }

    const { reference, bookingId } = (await req.json()) as {
      reference?: string;
      bookingId?: string;
    };

    const ref = String(reference || "").trim();
    const id = String(bookingId || "").trim();
    if (!ref || !id) {
      return NextResponse.json({ error: "Missing reference or bookingId" }, { status: 400 });
    }

    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const paystackData = (await paystackRes.json()) as {
      status?: boolean;
      data?: { status?: string };
    };

    if (!(paystackRes.ok && paystackData?.status && paystackData?.data?.status === "success")) {
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("consultation_bookings")
      .update({
        payment_status: "paid",
        payment_ref: ref,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Failed to update booking", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

