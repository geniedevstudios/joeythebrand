/**
 * Brevo Transactional Email via HTTPS (same `/v3/smtp/email` as sib-api-v3-sdk).
 */

export type SendContactInquiryParams = {
  toEmail: string;
  toName?: string;
  senderEmail: string;
  senderName: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  replyToEmail: string;
  replyToName: string;
};

const BREVO_API = "https://api.brevo.com/v3/smtp/email";

export async function sendContactInquiryEmail(params: SendContactInquiryParams): Promise<void> {
  const raw = process.env.BREVO_API_KEY;
  const apiKey = typeof raw === "string" ? raw.trim() : "";
  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not set");
  }

  const body = {
    sender: { email: params.senderEmail, name: params.senderName },
    to: [{ email: params.toEmail, name: params.toName ?? params.toEmail.split("@")[0] }],
    replyTo: { email: params.replyToEmail, name: params.replyToName },
    subject: params.subject,
    htmlContent: params.htmlContent,
    textContent: params.textContent,
  };

  const res = await fetch(BREVO_API, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Brevo API ${res.status}: ${errText.slice(0, 500)}`);
  }
}
