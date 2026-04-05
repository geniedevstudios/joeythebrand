import { loadEnvConfig } from "@next/env";
import { render } from "@react-email/render";
import { NextResponse } from "next/server";
import UrTailorContactMessage from "@/emails/UrTailorContactMessage";
import { parseContactPayload, isHoneypotTriggered } from "@/lib/contactPayload";
import { contactRateLimitConsume, getClientIp } from "@/lib/contactRateLimit";
import { sendContactInquiryEmail } from "@/services/emailService";

/** Ensures `.env.local` is applied (Turbopack + monorepo cwd edge cases). */
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production", undefined, true);

const DEFAULT_INBOX = "joeythebrandonline@gmail.com";

export async function postContact(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;

  if (isHoneypotTriggered(raw)) {
    return NextResponse.json({ ok: true, message: "Accepted" }, { status: 200 });
  }

  const ip = getClientIp(request);
  const limited = contactRateLimitConsume(ip);
  if (!limited.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Too many requests",
        retryAfterSeconds: limited.retryAfterSec,
      },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const parsed = parseContactPayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const { name, email, phone, subject, message } = parsed.data;

  const brevoApiKey = process.env.BREVO_API_KEY;
  const brevoKeyOk = typeof brevoApiKey === "string" && brevoApiKey.trim() !== "";
  if (!brevoKeyOk) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Email is not configured. Add BREVO_API_KEY (and BREVO_SENDER_EMAIL) to joey-darko/.env.local — see .env.example — then restart the dev server.",
      },
      { status: 503 },
    );
  }

  const senderEmailRaw = process.env.BREVO_SENDER_EMAIL;
  const senderEmail = typeof senderEmailRaw === "string" ? senderEmailRaw.trim() : "";
  if (!senderEmail) {
    return NextResponse.json(
      { ok: false, error: "BREVO_SENDER_EMAIL is not set (use a verified Brevo sender)." },
      { status: 503 },
    );
  }

  const contactToRaw = process.env.CONTACT_TO_EMAIL;
  const toEmail =
    typeof contactToRaw === "string" && contactToRaw.trim() !== "" ? contactToRaw.trim() : DEFAULT_INBOX;
  const senderNameRaw = process.env.BREVO_SENDER_NAME;
  const senderName =
    typeof senderNameRaw === "string" && senderNameRaw.trim() !== "" ? senderNameRaw.trim() : "URTAILORSTAILOR";

  const html = await render(
    UrTailorContactMessage({
      name,
      email,
      phone,
      subject,
      message,
    }),
  );

  const text = [
    "URTAILORSTAILOR — Website contact",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    phone.trim() ? `Phone: ${phone.trim()}` : null,
    `Subject: ${subject}`,
    "",
    message,
  ]
    .filter((line): line is string => line != null)
    .join("\n");

  try {
    await sendContactInquiryEmail({
      toEmail,
      toName: "Joey",
      senderEmail,
      senderName,
      subject,
      htmlContent: html,
      textContent: text,
      replyToEmail: email,
      replyToName: name,
    });
  } catch (err) {
    console.error("[contact] Brevo send failed:", err);
    return NextResponse.json(
      { ok: false, error: "Could not send email. Try again later." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, message: "Message sent" }, { status: 200 });
}
