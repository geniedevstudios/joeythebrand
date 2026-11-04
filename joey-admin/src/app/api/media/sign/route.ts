import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserFromBearer } from "@/lib/adminRequestAuth";

export const runtime = "nodejs";

function signature(params: Record<string, string>, apiSecret: string) {
  const signed = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(signed + apiSecret).digest("hex");
}

function safeFolder(input: unknown) {
  const clean = String(input || "uploads")
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => part.replace(/[^a-zA-Z0-9_-]/g, ""))
    .filter(Boolean)
    .join("/")
    .slice(0, 80);
  return clean || "uploads";
}

export async function POST(request: Request) {
  const user = await getUserFromBearer(request);
  if (!user?.email) return NextResponse.json({ error: "Sign in again before uploading." }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return NextResponse.json({ error: "Sign in again before uploading." }, { status: 500 });

  const admin = createClient(url, service);
  const { data, error } = await admin
    .from("admin_operator_emails")
    .select("email")
    .eq("email", user.email.trim().toLowerCase())
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Sign in again before uploading." }, { status: 403 });

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Cloud storage is not configured." }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const resourceType = body?.resourceType === "video" ? "video" : "image";
  const folder = "joey";
  const publicId = `${safeFolder(body?.folder)}/${randomUUID()}`;
  const timestamp = String(Math.round(Date.now() / 1000));
  return NextResponse.json({
    cloudName,
    apiKey,
    timestamp,
    folder,
    publicId,
    resourceType,
    signature: signature({ folder, public_id: publicId, timestamp }, apiSecret),
  });
}
