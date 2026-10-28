import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import BespokeBookingEmail from "@/emails/BespokeBookingEmail";
import { verifyConsultationPaystackAndNotify } from "@/lib/consultationWorkflow";

export const runtime = "nodejs";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function getResendSender() {
  const resend = new Resend(process.env.RESEND_API_KEY);
  return {
    send: (msg: any) => resend.emails.send(msg),
  };
}

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

    const result = await verifyConsultationPaystackAndNotify({
      supabaseAdmin: getSupabaseAdmin(),
      emailSender: getResendSender(),
      renderEmail: (props) => BespokeBookingEmail(props),
      brandFromName: "JOEY The brand",
      reference: ref,
      bookingId: id,
      defaultExpectedGhs: 1110,
      paystackSecretKey: secret,
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
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
