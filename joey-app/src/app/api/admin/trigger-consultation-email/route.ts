import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import BespokeBookingEmail from "@/emails/BespokeBookingEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
    }

    const { data: bookingData, error } = await supabaseAdmin
      .from("consultation_bookings")
      .select("customer_name, customer_email, customer_phone, service, preferred_date, booking_code, notes, status")
      .eq("id", id)
      .single();

    if (error || !bookingData) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404, headers: { "Access-Control-Allow-Origin": "*" } });
    }

    if (bookingData.status !== "confirmed") {
      return NextResponse.json({ error: "Booking is not confirmed" }, { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
    }

    let finalBookingCode = bookingData.booking_code;
    
    // Generate a new booking code if it doesn't exist (BSP-XXXXX)
    if (!finalBookingCode) {
      finalBookingCode = `BSP-${Math.random().toString().slice(2, 7)}`;
      await supabaseAdmin
        .from("consultation_bookings")
        .update({ booking_code: finalBookingCode })
        .eq("id", id);
    }

    if (bookingData.customer_email) {
      const fromEmail = process.env.RESEND_APPOINTMENTS_EMAIL || "appointments@joeythebrand.com";
      await resend.emails.send({
        from: `JOEY The brand <${fromEmail}>`,
        to: bookingData.customer_email,
        subject: `Bespoke Appointment Confirmed - ${finalBookingCode}`,
        react: BespokeBookingEmail({
          customerName: bookingData.customer_name || "Customer",
          customerEmail: bookingData.customer_email,
          customerPhone: bookingData.customer_phone || "",
          service: bookingData.service || "Bespoke Service",
          preferredDate: bookingData.preferred_date || "",
          bookingCode: finalBookingCode,
          status: "confirmed",
          notes: bookingData.notes || "",
        }),
      });
    }

    return NextResponse.json({ ok: true }, { headers: { "Access-Control-Allow-Origin": "*" } });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
  }
}
