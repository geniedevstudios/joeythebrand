import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { Resend } from "resend";
import UrTailorBookingEmail from "@/emails/UrTailorBookingEmail";
import {
  inspectRescheduleProposalToken,
  respondToRescheduleProposal,
} from "@/lib/consultationWorkflow";

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
        slipToken: result.booking.portfolio_access_token || undefined,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    );
  }
}

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
    const baseUrl = getBaseUrl();

    const result = await respondToRescheduleProposal({
      supabaseAdmin: getSupabaseAdmin(),
      emailSender: { send: (msg: any) => resend.emails.send(msg) },
      renderEmail: (props) => UrTailorBookingEmail(props),
      brandFromName: "URTAILORSTAILOR",
      token,
      action,
      preferredDate: body.preferredDate,
      preferredTime: body.preferredTime,
      message: body.message,
      getSlipUrl: (row) =>
        row.portfolio_access_token
          ? `${baseUrl}/booking/slip?token=${encodeURIComponent(row.portfolio_access_token)}`
          : `${baseUrl}/booking`,
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
      slipToken: result.booking?.portfolio_access_token,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    );
  }
}
