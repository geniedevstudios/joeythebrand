import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { processOrderNotificationOutbox } from "@/lib/orderWorkflow";

export const runtime = "nodejs";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function isAuthorizedCronRequest(req: Request): boolean {
  const cronSecret =
    process.env.CRON_SECRET?.trim() ||
    process.env.ADMIN_API_SECRET?.trim() ||
    process.env.SEND_EMAIL_SECRET?.trim() ||
    "";

  if (!cronSecret) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const customHeader = req.headers.get("x-cron-secret")?.trim() || "";

  return bearer === cronSecret || customHeader === cronSecret;
}

async function handleProcessOutbox(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await processOrderNotificationOutbox({
      supabaseAdmin: getSupabaseAdmin(),
      emailSender: {
        send: (msg: any, options?: { idempotencyKey?: string }) =>
          resend.emails.send(
            msg,
            options?.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : undefined,
          ),
      },
      limit: 25,
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Outbox worker error",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  return handleProcessOutbox(req);
}

export async function POST(req: Request) {
  return handleProcessOutbox(req);
}
