import crypto from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import BespokeBookingEmail from "@/emails/BespokeBookingEmail";
import { verifyConsultationPaystackAndNotify } from "@/lib/consultationWorkflow";
import { verifyAndReconcileOrderPayment } from "@/lib/orderWorkflow";

export const runtime = "nodejs";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

type PaystackEvent = {
  event?: string;
  data?: {
    reference?: string;
    metadata?: {
      orderId?: string;
      order_id?: string;
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

  if (evt.event && !/charge\.success/i.test(evt.event)) {
    return NextResponse.json({ ok: true });
  }

  const reference = evt.data?.reference?.trim() || "";
  if (!reference) return NextResponse.json({ ok: true });

  const supabaseAdmin = getSupabaseAdmin();
  const resend = new Resend(process.env.RESEND_API_KEY);

  const bookingIdFromMeta =
    evt.data?.metadata?.bookingId?.trim() ||
    evt.data?.metadata?.booking_id?.trim() ||
    evt.data?.metadata?.custom_fields?.find((f) => f.variable_name === "booking_id")?.value?.trim() ||
    "";

  // 1. Consultation booking webhook reconciliation
  if (bookingIdFromMeta || reference.startsWith("BSP-")) {
    await verifyConsultationPaystackAndNotify({
      supabaseAdmin,
      emailSender: { send: (msg: any) => resend.emails.send(msg) },
      renderEmail: (props) => BespokeBookingEmail(props),
      brandFromName: "JOEY The brand",
      reference,
      bookingId: bookingIdFromMeta || undefined,
      defaultExpectedGhs: 1110,
      paystackSecretKey: secret,
    });
    return NextResponse.json({ ok: true });
  }

  // 2. Order payment webhook reconciliation (shared atomic stock + durable outbox)
  const orderIdFromMeta =
    evt.data?.metadata?.orderId?.trim() ||
    evt.data?.metadata?.order_id?.trim() ||
    evt.data?.metadata?.custom_fields?.find((f) => f.variable_name === "order_id")?.value?.trim() ||
    "";

  await verifyAndReconcileOrderPayment({
    supabaseAdmin,
    emailSender: {
      send: (msg: any, options?: { idempotencyKey?: string }) =>
        resend.emails.send(
          msg,
          options?.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : undefined,
        ),
    },
    reference,
    orderId: orderIdFromMeta || undefined,
    paystackSecretKey: secret,
  });

  return NextResponse.json({ ok: true });
}
