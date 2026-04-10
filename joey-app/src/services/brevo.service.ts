/**
 * Brevo Contacts API (same REST contract as sib-api-v3-sdk ContactsApi).
 * SDK omitted: incompatible with Next.js 16 / Turbopack (see emailService.ts).
 */

const BREVO_CONTACTS_URL = "https://api.brevo.com/v3/contacts";

function parseListIds(): number[] {
  const raw = process.env.BREVO_SUBSCRIBE_LIST_ID?.trim() ?? "3";
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return [3];
  return [n];
}

/**
 * Add/update contact on Brevo list "All Updates" (default list id 3).
 * Never throws: logs and returns so callers can always complete the HTTP response.
 */
export async function addToAllUpdates(email: string): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[brevo.service] BREVO_API_KEY missing; skip list sync");
    return;
  }

  const listIds = parseListIds();
  const body = {
    email: email.toLowerCase().trim(),
    listIds,
    updateEnabled: true,
  };

  try {
    const res = await fetch(BREVO_CONTACTS_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      console.error("[brevo.service] addToAllUpdates failed:", res.status, text.slice(0, 500));
    }
  } catch (err) {
    console.error("[brevo.service] addToAllUpdates error:", err);
  }
}
