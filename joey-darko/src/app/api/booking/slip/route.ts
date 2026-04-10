import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim();
  if (!token || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
    return NextResponse.json({ error: "Invalid link." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("consultation_bookings")
      .select(
        "customer_name, customer_email, customer_phone, service, preferred_date, notes, status, booking_code, scheduled_at, created_at",
      )
      .eq("portfolio_access_token", token)
      .eq("source", "portfolio")
      .maybeSingle();

    if (error) {
      console.error("Slip fetch:", error);
      return NextResponse.json({ error: "Could not load booking." }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    const row = data as Record<string, unknown>;
    return NextResponse.json({
      status: row.status as string,
      customerName: row.customer_name as string,
      customerEmail: row.customer_email as string,
      customerPhone: row.customer_phone as string,
      service: row.service as string,
      preferredDate: (row.preferred_date as string) || undefined,
      notes: (row.notes as string) || undefined,
      bookingCode: row.booking_code ? String(row.booking_code).trim() || undefined : undefined,
      scheduledAt: (row.scheduled_at as string) || undefined,
      createdAt: row.created_at as string,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
}
