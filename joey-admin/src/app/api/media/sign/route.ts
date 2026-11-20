import { randomUUID } from "node:crypto";
import { AwsClient } from "aws4fetch";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserFromBearer } from "@/lib/adminRequestAuth";

import { IMAGE_UPLOAD_LIMIT, MEDIA_TYPES, VIDEO_UPLOAD_LIMIT } from "@/lib/mediaUpload";

export const runtime = "nodejs";

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

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  }

  const endpoint = process.env.R2_S3_ENDPOINT?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  const publicBase = process.env.R2_PUBLIC_BASE_URL?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  if (!endpoint || !bucket || !publicBase || !accessKeyId || !secretAccessKey) {
    return NextResponse.json({ error: "R2 upload settings are incomplete." }, { status: 503 });
  }

  const contentType = typeof body.contentType === "string" ? body.contentType : "";
  const extension = Object.hasOwn(MEDIA_TYPES, contentType) ? MEDIA_TYPES[contentType] : undefined;
  if (!extension) {
    return NextResponse.json({
      error: "Upload a JPEG, PNG, WebP, GIF, AVIF, MP4, or WebM file. Export other video formats as MP4.",
    }, { status: 415 });
  }
  const maxBytes = contentType.startsWith("video/") ? VIDEO_UPLOAD_LIMIT : IMAGE_UPLOAD_LIMIT;
  if (!Number.isSafeInteger(body.size) || body.size <= 0 || body.size > maxBytes) {
    return NextResponse.json({ error: "Choose a non-empty file within the upload size limit." }, { status: 400 });
  }

  try {
    const objectKey = `joey/${safeFolder(body.folder)}/${randomUUID()}.${extension}`;
    const uploadUrl = new URL(`/${bucket}/${objectKey}`, endpoint);
    const publicUrl = new URL(objectKey, publicBase.replace(/\/+$/, "") + "/");
    if (!uploadUrl.hostname.endsWith(".r2.cloudflarestorage.com") ||
        uploadUrl.protocol !== "https:" || publicUrl.protocol !== "https:" ||
        uploadUrl.username || uploadUrl.password || publicUrl.username || publicUrl.password ||
        !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)) {
      return NextResponse.json({ error: "Check the R2 endpoint, bucket name, and public URL." }, { status: 503 });
    }
    uploadUrl.searchParams.set("X-Amz-Expires", "300");
    const client = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });
    const signed = await client.sign(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      aws: { signQuery: true, allHeaders: true },
    });
    return NextResponse.json({ provider: "r2", uploadUrl: signed.url, publicUrl: publicUrl.href }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Could not prepare the R2 upload. Check the storage settings." }, { status: 503 });
  }
}
