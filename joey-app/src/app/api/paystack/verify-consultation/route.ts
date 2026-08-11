import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import BespokeBookingEmail from "@/emails/BespokeBookingEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

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

    const { data: bookingData, error } = await supabaseAdmin
      .from("consultation_bookings")
      .update({
        payment_status: "paid",
        payment_ref: ref,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("customer_name, customer_email, customer_phone, service, preferred_date, booking_code, notes")
      .single();

    if (error || !bookingData) {
      return NextResponse.json({ error: "Failed to update booking", details: error?.message }, { status: 500 });
    }

    try {
      if (bookingData.customer_email) {
        const fromEmail = process.env.RESEND_APPOINTMENTS_EMAIL || "appointments@joeythebrand.com";
        await resend.emails.send({
          from: `JOEY The brand <${fromEmail}>`,
          to: bookingData.customer_email,
          subject: `Bespoke Appointment Request - Pending Review`,
          react: BespokeBookingEmail({
            customerName: bookingData.customer_name || "Customer",
            customerEmail: bookingData.customer_email,
            customerPhone: bookingData.customer_phone || "",
            service: bookingData.service || "Bespoke Service",
            preferredDate: bookingData.preferred_date || "",
            bookingCode: bookingData.booking_code || id.slice(-8),
            status: "pending",
            notes: bookingData.notes || "",
          }),
        });
      }
    } catch (emailErr) {
      console.error("Failed to send bespoke confirmation email:", emailErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

