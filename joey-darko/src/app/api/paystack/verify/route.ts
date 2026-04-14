import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

/**
 * Verifies a Paystack transaction and updates the booking status to 'paid'.
 * Expects { reference: string, bookingId: string }
 */
export async function POST(request: Request) {
  try {
    const { reference, bookingId } = await request.json();

    if (!reference || !bookingId) {
      return NextResponse.json({ error: "Missing reference or bookingId" }, { status: 400 });
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return NextResponse.json({ error: "Paystack is not configured." }, { status: 500 });
    }

    // 1) Verify with Paystack
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const paystackData = await paystackRes.json();

    if (!paystackRes.ok || !paystackData.status || paystackData.data.status !== "success") {
      const providerStatus =
        paystackData && typeof paystackData === "object" && paystackData.data && typeof paystackData.data === "object"
          ? (paystackData.data.status as unknown)
          : null;

      const paymentStatus = providerStatus === "failed" ? "failed" : "pending";

      const supabase = getSupabaseAdmin();
      await supabase
        .from("consultation_bookings")
        .update({
          payment_status: paymentStatus,
          payment_ref: reference,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);

      return NextResponse.json({ 
        error: "Payment verification failed", 
        details: paystackData.message || "Unknown error" 
      }, { status: 400 });
    }

    // 2) Update Supabase
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("consultation_bookings")
      .update({
        payment_status: "paid",
        payment_ref: reference,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (error) {
      console.error("Supabase update error after payment:", error);
      return NextResponse.json({ error: "Payment verified but database update failed." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, amount: paystackData.data.amount });
  } catch (err) {
    console.error("Paystack verify error:", err);
    return NextResponse.json({ error: "Internal server error during verification." }, { status: 500 });
  }
}
