import crypto from "crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

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
    status?: string;
    metadata?: {
      bookingId?: string;
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
    return NextResponse.json({ ok: true }); // nothing to reconcile
  }

  // We only act on success-like events; still verify server-side for safety.
  if (evt.event && !/charge\.success/i.test(evt.event)) {
    return NextResponse.json({ ok: true });
  }

  const bookingIdFromMeta =
    evt.data?.metadata?.bookingId?.trim() ||
    evt.data?.metadata?.custom_fields?.find((f) => f.variable_name === "booking_id")?.value?.trim() ||
    "";

  const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });

  const verifyData = (await verifyRes.json()) as any;
  const success = Boolean(verifyRes.ok && verifyData?.status && verifyData?.data?.status === "success");

  const supabase = getSupabaseAdmin();
  const update = success
    ? { payment_status: "paid", payment_ref: reference, updated_at: new Date().toISOString() }
    : { payment_status: verifyData?.data?.status === "failed" ? "failed" : "pending", payment_ref: reference, updated_at: new Date().toISOString() };

  if (bookingIdFromMeta) {
    await supabase.from("consultation_bookings").update(update).eq("id", bookingIdFromMeta);
  } else {
    await supabase.from("consultation_bookings").update(update).eq("payment_ref", reference);
  }

  return NextResponse.json({ ok: true });
}

