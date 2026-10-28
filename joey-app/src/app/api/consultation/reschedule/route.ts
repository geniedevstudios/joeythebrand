import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import BespokeBookingEmail from "@/emails/BespokeBookingEmail";
import {
  inspectRescheduleProposalToken,
  respondToRescheduleProposal,
} from "@/lib/consultationWorkflow";

export const runtime = "nodejs";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * GET /api/consultation/reschedule?token=...
 * Validates the signed reschedule token without consuming it (safe against email scanner prefetch).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token")?.trim() || "";
    if (!token) {
      return NextResponse.json(
        { ok: false, code: "missing_token", error: "Missing reschedule token." },
        { status: 400 },
      );
    }

    const result = await inspectRescheduleProposalToken({
      supabaseAdmin: getSupabaseAdmin(),
      token,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, code: result.code, error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json({
      ok: true,
      booking: {
        id: result.booking.id,
        customerName: result.booking.customer_name,
        service: result.booking.service,
        preferredFormatted: result.preferredFormatted,
        proposedScheduledAt: result.payload.psa,
        proposedFormatted: result.proposedFormatted,
        rescheduleNote: result.booking.reschedule_note || undefined,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/consultation/reschedule
 * Atomically executes customer's single-use response ("accept" or "request_another_time").
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      token?: string;
      action?: "accept" | "request_another_time";
      preferredDate?: string;
      preferredTime?: string;
      message?: string;
    };

    const token = String(body.token || "").trim();
    const action = body.action;
    if (!token || (action !== "accept" && action !== "request_another_time")) {
      return NextResponse.json(
        { ok: false, error: "Missing token or valid action." },
        { status: 400 },
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await respondToRescheduleProposal({
      supabaseAdmin: getSupabaseAdmin(),
      emailSender: { send: (msg: any) => resend.emails.send(msg) },
      renderEmail: (props) => BespokeBookingEmail(props),
      brandFromName: "JOEY The brand",
      token,
      action,
      preferredDate: body.preferredDate,
      preferredTime: body.preferredTime,
      message: body.message,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, code: result.code, error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json({
      ok: true,
      status: result.booking?.status,
      bookingCode: result.booking?.booking_code,
      scheduledAt: result.booking?.scheduled_at,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    );
  }
}
