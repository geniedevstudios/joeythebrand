import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { Resend } from "resend";
import UrTailorBookingEmail from "@/emails/UrTailorBookingEmail";
import { verifyConsultationPaystackAndNotify } from "@/lib/consultationWorkflow";

export const runtime = "nodejs";

function getBaseUrl(): string {
  const explicit =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_PORTFOLIO_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;
  return "https://urtailorstailor.com";
}

function getResendSender() {
  const resend = new Resend(process.env.RESEND_API_KEY);
  return {
    send: (msg: any) => resend.emails.send(msg),
  };
}

/**
 * Verifies a Paystack transaction and updates the booking status to 'paid',
 * then dispatches customer and admin pending consultation notifications.
 * Expects { reference: string, bookingId: string }
 */
export async function POST(request: Request) {
  try {
    const { reference, bookingId } = await request.json();

    if (!reference || !bookingId) {
      return NextResponse.json({ error: "Missing reference or bookingId" }, { status: 400 });
    }

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ error: "Paystack is not configured." }, { status: 500 });
    }

    const baseUrl = getBaseUrl();
    const result = await verifyConsultationPaystackAndNotify({
      supabaseAdmin: getSupabaseAdmin(),
      emailSender: getResendSender(),
      renderEmail: (props) => UrTailorBookingEmail(props),
      brandFromName: "URTAILORSTAILOR",
      reference: String(reference).trim(),
      bookingId: String(bookingId).trim(),
      defaultExpectedGhs: 1000,
      paystackSecretKey: secret,
      getSlipUrl: (row) =>
        row.portfolio_access_token
          ? `${baseUrl}/booking/slip?token=${encodeURIComponent(row.portfolio_access_token)}`
          : `${baseUrl}/booking`,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, details: result.details },
        { status: result.status },
      );
    }

    return NextResponse.json({
      ok: true,
      amount: result.amount,
      alreadyPaid: result.alreadyPaid,
    });
  } catch (err) {
    console.error("Paystack verify error:", err);
    return NextResponse.json(
      { error: "Internal server error during verification." },
      { status: 500 },
    );
  }
}
