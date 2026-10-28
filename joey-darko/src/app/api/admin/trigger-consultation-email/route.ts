import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { Resend } from "resend";
import UrTailorBookingEmail from "@/emails/UrTailorBookingEmail";
import {
  handleAdminConsultationAction,
  verifyAdminRequest,
} from "@/lib/consultationWorkflow";

export const runtime = "nodejs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Secret",
};

function getSupabaseAnon() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
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

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const supabaseAnon = getSupabaseAnon();

    const auth = await verifyAdminRequest(req, supabaseAdmin, supabaseAnon);
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status, headers: corsHeaders },
      );
    }

    const body = (await req.json()) as {
      id?: string;
      action?: "confirm" | "reschedule" | "cancel";
      scheduledAt?: string;
      proposedDate?: string;
      proposedTime?: string;
      proposedScheduledAt?: string;
      rescheduleNote?: string;
      cancellationReason?: string;
    };

    const id = String(body.id || "").trim();
    if (!id) {
      return NextResponse.json(
        { error: "Missing booking ID" },
        { status: 400, headers: corsHeaders },
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const baseUrl = getBaseUrl();

    const result = await handleAdminConsultationAction({
      supabaseAdmin,
      emailSender: { send: (msg: any) => resend.emails.send(msg) },
      renderEmail: (props) => UrTailorBookingEmail(props),
      brandFromName: "URTAILORSTAILOR",
      baseUrl,
      reschedulePath: "/booking/reschedule",
      adminEmail: auth.adminEmail,
      bookingId: id,
      action: body.action || "confirm",
      scheduledAt: body.scheduledAt,
      proposedDate: body.proposedDate,
      proposedTime: body.proposedTime,
      proposedScheduledAt: body.proposedScheduledAt,
      rescheduleNote: body.rescheduleNote,
      cancellationReason: body.cancellationReason,
      getSlipUrl: (row) =>
        row.portfolio_access_token
          ? `${baseUrl}/booking/slip?token=${encodeURIComponent(row.portfolio_access_token)}`
          : `${baseUrl}/booking`,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      { ok: true, booking: result.booking },
      { headers: corsHeaders },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Internal Server Error", details: err instanceof Error ? err.message : String(err) },
      { status: 500, headers: corsHeaders },
    );
  }
}
