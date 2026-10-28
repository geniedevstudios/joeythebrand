import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim();
  if (!token || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
    return NextResponse.json({ ok: false, error: "Invalid link." }, { status: 200 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("consultation_bookings")
      .select(
        "*",
      )
      .eq("portfolio_access_token", token)
      .eq("source", "portfolio")
      .maybeSingle();

    if (error) {
      console.error("Slip fetch:", error);
      return NextResponse.json({ ok: false, error: "Could not load booking." }, { status: 200 });
    }
    if (!data) {
      // Returning 200 here prevents noisy "Failed to load resource" console spam for tokens
      // that are stale/mistyped, while still allowing the client to show a friendly error.
      return NextResponse.json({ ok: false, error: "Booking not found." }, { status: 200 });
    }

    const row = data as Record<string, unknown>;
    return NextResponse.json({
      ok: true,
      bookingId: row.id as string,
      paymentRef: row.payment_ref ? String(row.payment_ref).trim() || undefined : undefined,
      status: row.status as string,
      customerName: row.customer_name as string,
      customerEmail: row.customer_email as string,
      customerPhone: row.customer_phone as string,
      service: row.service as string,
      preferredDate: (row.preferred_date as string) || undefined,
      preferredTime: row.preferred_time != null ? String(row.preferred_time).trim() || undefined : undefined,
      notes: (row.notes as string) || undefined,
      bookingCode: row.booking_code ? String(row.booking_code).trim() || undefined : undefined,
      scheduledAt: (row.scheduled_at as string) || undefined,
      proposedScheduledAt: (row.proposed_scheduled_at as string) || undefined,
      rescheduleNote: (row.reschedule_note as string) || undefined,
      cancellationReason: (row.cancellation_reason as string) || undefined,
      refundReviewRequired: Boolean(row.refund_review_required),
      durationHours: (row.duration_hours as number) || undefined,
      priceGhs: (row.price_ghs as number) || undefined,
      paymentStatus: (row.payment_status as string) || "unpaid",
      createdAt: row.created_at as string,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Server configuration error." }, { status: 200 });
  }
}
