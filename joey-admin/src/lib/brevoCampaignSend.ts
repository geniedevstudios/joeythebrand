/**
 * Create a classic email campaign and send immediately (Brevo Marketing API).
 */

const CREATE_URL = "https://api.brevo.com/v3/emailCampaigns";

export function parseNewsletterListIds(): number[] {
  const raw = process.env.BREVO_SUBSCRIBE_LIST_ID?.trim() ?? "3";
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return [3];
  return [n];
}

export type CreateSendNewsletterInput = {
  /** Internal campaign name in Brevo */
  name: string;
  subject: string;
  htmlContent: string;
  previewText?: string;
  replyTo?: string;
};

export async function createAndSendNewsletter(input: CreateSendNewsletterInput): Promise<{ campaignId: number }> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
  const senderName = process.env.BREVO_SENDER_NAME?.trim() || "JOEY The brand";

  if (!apiKey) {
    throw new Error(
      "BREVO_API_KEY is missing. Add it to joey-admin/.env.local (the admin app does not read joey-app env), then restart npm run dev.",
    );
  }
  if (!senderEmail) {
    throw new Error(
      "BREVO_SENDER_EMAIL is missing. Add it to joey-admin/.env.local, then restart the dev server.",
    );
  }

  const listIds = parseNewsletterListIds();

  const body: Record<string, unknown> = {
    name: input.name,
    subject: input.subject,
    sender: { name: senderName, email: senderEmail },
    type: "classic",
    htmlContent: input.htmlContent,
    recipients: { listIds },
    inlineImageActivation: false,
  };

  if (input.previewText?.trim()) {
    body.previewText = input.previewText.trim().slice(0, 255);
  }
  if (input.replyTo?.trim()) {
    body.replyTo = input.replyTo.trim();
  }

  const createRes = await fetch(CREATE_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!createRes.ok) {
    const errText = await createRes.text().catch(() => createRes.statusText);
    throw new Error(`Brevo could not create the campaign (${createRes.status}). ${errText.slice(0, 400)}`);
  }

  const created = (await createRes.json()) as { id?: number };
  const campaignId = created.id;
  if (typeof campaignId !== "number") {
    throw new Error("Brevo returned an unexpected response when creating the campaign.");
  }

  const sendRes = await fetch(`${CREATE_URL}/${campaignId}/sendNow`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
    },
  });

  if (!sendRes.ok) {
    const errText = await sendRes.text().catch(() => sendRes.statusText);
    throw new Error(
      `Campaign #${campaignId} was created but could not be sent (${sendRes.status}). ${errText.slice(0, 400)}`,
    );
  }

  return { campaignId };
}
