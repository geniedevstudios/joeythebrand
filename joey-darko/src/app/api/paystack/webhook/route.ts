import crypto from "crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { Resend } from "resend";
import UrTailorBookingEmail from "@/emails/UrTailorBookingEmail";
import { verifyConsultationPaystackAndNotify } from "@/lib/consultationWorkflow";

export const runtime = "nodejs";

function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function getBaseUrl(): string {
  const explicit =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_PORTFOLIO_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;
  return "https://urtailorstailor.com";
}

type PaystackEvent = {
  event?: string;
  data?: {
    reference?: string;
    status?: string;
    metadata?: {
      bookingId?: string;
      booking_id?: string;
      custom_fields?: Array<{
        variable_name?: string;
        value?: string;
      }>;
    };
  };
};

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: "Paystack is not configured." }, { status: 500 });
  }

  const signature = request.headers.get("x-paystack-signature") || "";
  const rawBody = await request.text();

  const computed = crypto.createHmac("sha512", secret).update(rawBody, "utf8").digest("hex");
  if (!signature || !safeEqualHex(signature, computed)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let evt: PaystackEvent;
  try {
    evt = JSON.parse(rawBody) as PaystackEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reference = evt.data?.reference?.trim() || "";
  if (!reference) {
    return NextResponse.json({ ok: true });
  }

  if (evt.event && !/charge\.success/i.test(evt.event)) {
    return NextResponse.json({ ok: true });
  }

  const bookingIdFromMeta =
    evt.data?.metadata?.bookingId?.trim() ||
    evt.data?.metadata?.booking_id?.trim() ||
    evt.data?.metadata?.custom_fields?.find((f) => f.variable_name === "booking_id")?.value?.trim() ||
    "";

  const resend = new Resend(process.env.RESEND_API_KEY);
  const baseUrl = getBaseUrl();

  await verifyConsultationPaystackAndNotify({
    supabaseAdmin: getSupabaseAdmin(),
    emailSender: { send: (msg: any) => resend.emails.send(msg) },
    renderEmail: (props) => UrTailorBookingEmail(props),
    brandFromName: "URTAILORSTAILOR",
    reference,
    bookingId: bookingIdFromMeta || undefined,
    defaultExpectedGhs: 1000,
    paystackSecretKey: secret,
    getSlipUrl: (row) =>
      row.portfolio_access_token
        ? `${baseUrl}/booking/slip?token=${encodeURIComponent(row.portfolio_access_token)}`
        : `${baseUrl}/booking`,
  });

  return NextResponse.json({ ok: true });
}
