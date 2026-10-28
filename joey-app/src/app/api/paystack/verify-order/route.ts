import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { verifyAndReconcileOrderPayment } from "@/lib/orderWorkflow";

export const runtime = "nodejs";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function getResendOrderSender() {
  const resend = new Resend(process.env.RESEND_API_KEY);
  return {
    send: (msg: any, options?: { idempotencyKey?: string }) =>
      resend.emails.send(
        msg,
        options?.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : undefined,
      ),
  };
}

export async function POST(req: Request) {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ error: "Paystack is not configured." }, { status: 500 });
    }

    const { reference, orderId } = (await req.json()) as {
      reference?: string;
      orderId?: string;
    };

    if (!reference || !orderId) {
      return NextResponse.json({ error: "Missing reference or orderId" }, { status: 400 });
    }

    const result = await verifyAndReconcileOrderPayment({
      supabaseAdmin: getSupabaseAdmin(),
      emailSender: getResendOrderSender(),
      reference: String(reference).trim(),
      orderId: String(orderId).trim(),
      paystackSecretKey: secret,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      alreadyPaid: result.alreadyPaid,
      orderStatus: result.orderStatus,
      stockConflictFlagged: result.stockConflictFlagged,
    });
  } catch (err) {
    console.error("Verify Error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
