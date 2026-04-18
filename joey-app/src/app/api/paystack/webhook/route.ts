import crypto from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

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

  // Only reconcile success events; verify server-side anyway.
  if (evt.event && !/charge\.success/i.test(evt.event)) {
    return NextResponse.json({ ok: true });
  }

  const reference = evt.data?.reference?.trim() || "";
  if (!reference) return NextResponse.json({ ok: true });

  const orderIdFromMeta =
    evt.data?.metadata?.orderId?.trim() ||
    evt.data?.metadata?.custom_fields?.find((f) => f.variable_name === "order_id")?.value?.trim() ||
    "";

  const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const verifyData = (await verifyRes.json()) as {
    status?: boolean;
    data?: { status?: string };
  };

  if (!(verifyRes.ok && verifyData?.status && verifyData?.data?.status === "success")) {
    return NextResponse.json({ ok: true });
  }

  if (orderIdFromMeta) {
    await supabaseAdmin
      .from("orders")
      .update({
        payment_status: "paid",
        payment_ref: reference,
        status: "processing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderIdFromMeta);
  } else {
    await supabaseAdmin
      .from("orders")
      .update({
        payment_status: "paid",
        payment_ref: reference,
        status: "processing",
        updated_at: new Date().toISOString(),
      })
      .eq("payment_ref", reference);
  }

  return NextResponse.json({ ok: true });
}

