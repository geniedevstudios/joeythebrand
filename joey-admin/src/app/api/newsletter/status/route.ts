import { NextResponse } from "next/server";
import { getUserFromBearer } from "@/lib/adminRequestAuth";

export const runtime = "nodejs";

/**
 * Returns whether Brevo env is present for this admin server (no secrets exposed).
 */
export async function GET(request: Request) {
  const user = await getUserFromBearer(request);
  if (!user?.email) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const missing: string[] = [];
  if (!process.env.BREVO_API_KEY?.trim()) missing.push("BREVO_API_KEY");
  if (!process.env.BREVO_SENDER_EMAIL?.trim()) missing.push("BREVO_SENDER_EMAIL");
  if (!process.env.BREVO_SENDER_NAME?.trim()) missing.push("BREVO_SENDER_NAME");

  return NextResponse.json({
    ok: true,
    brevoReady: missing.length === 0,
    missing,
  });
}
