import { NextResponse } from "next/server";
import { createAndSendNewsletter } from "@/lib/brevoCampaignSend";
import { getUserFromBearer, isNewsletterSenderAllowed } from "@/lib/adminRequestAuth";
import {
  wrapSimpleNewsletterHtml,
  parseNewsletterTemplateFromRequest,
  buildNewsletterTemplateHtml,
} from "@/lib/newsletterHtml";

export const runtime = "nodejs";

const MAX_SUBJECT = 200;
const MAX_PREVIEW = 255;
const MAX_HTML = 400_000;
const MAX_PLAIN = 50_000;

export async function POST(request: Request) {
  const user = await getUserFromBearer(request);
  if (!user?.email) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!isNewsletterSenderAllowed(user.email)) {
    return NextResponse.json({ ok: false, error: "Not allowed to send newsletters." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const subject = typeof o.subject === "string" ? o.subject.trim() : "";
  const previewText = typeof o.previewText === "string" ? o.previewText.trim() : "";
  const editorMode = o.editorMode === "template" || o.editorMode === "html" || o.editorMode === "simple"
    ? o.editorMode
    : o.simpleMode === true
      ? "simple"
      : o.simpleMode === false
        ? "html"
        : "simple";
  const bodyContent = typeof o.body === "string" ? o.body : "";

  if (!subject || subject.length > MAX_SUBJECT) {
    return NextResponse.json({ ok: false, error: "Invalid subject" }, { status: 400 });
  }
  if (previewText.length > MAX_PREVIEW) {
    return NextResponse.json({ ok: false, error: "Preview text too long" }, { status: 400 });
  }

  let htmlContent: string;
  if (editorMode === "template") {
    const parsed = parseNewsletterTemplateFromRequest(o.template);
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
    }
    htmlContent = buildNewsletterTemplateHtml(parsed.input);
    if (htmlContent.length > MAX_HTML) {
      return NextResponse.json({ ok: false, error: "Generated email is too large." }, { status: 400 });
    }
  } else if (editorMode === "simple") {
    const plain = bodyContent.trim();
    if (!plain || plain.length > MAX_PLAIN) {
      return NextResponse.json({ ok: false, error: "Invalid message body" }, { status: 400 });
    }
    const useWrap = o.simpleMode !== false;
    if (useWrap) {
      htmlContent = wrapSimpleNewsletterHtml(plain);
    } else {
      htmlContent = plain;
      if (htmlContent.length > MAX_HTML) {
        return NextResponse.json({ ok: false, error: "HTML body too large" }, { status: 400 });
      }
    }
  } else {
    htmlContent = bodyContent.trim();
    if (!htmlContent || htmlContent.length > MAX_HTML) {
      return NextResponse.json({ ok: false, error: "Invalid HTML body" }, { status: 400 });
    }
  }

  const internalName = `Admin · ${new Date().toISOString().slice(0, 19)} · ${subject.slice(0, 60)}`;
  const replyTo =
    typeof o.replyTo === "string" && o.replyTo.trim()
      ? o.replyTo.trim()
      : process.env.NEWSLETTER_REPLY_TO?.trim() || process.env.BREVO_SENDER_EMAIL?.trim();

  try {
    const { campaignId } = await createAndSendNewsletter({
      name: internalName,
      subject,
      htmlContent,
      previewText: previewText || undefined,
      replyTo,
    });
    return NextResponse.json({ ok: true, campaignId, message: "Campaign sent." }, { status: 200 });
  } catch (e) {
    console.error("[newsletter/send]", e);
    const msg = e instanceof Error ? e.message : "Send failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
