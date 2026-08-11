import { Resend } from "resend";

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

export async function sendContactInquiryEmail(params: SendContactInquiryParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: `${params.senderName} <${params.senderEmail}>`,
    to: [params.toEmail],
    replyTo: `${params.replyToName} <${params.replyToEmail}>`,
    subject: params.subject,
    html: params.htmlContent,
    text: params.textContent,
  });

  if (error) {
    throw new Error(`Resend API Error: ${error.message}`);
  }
}
