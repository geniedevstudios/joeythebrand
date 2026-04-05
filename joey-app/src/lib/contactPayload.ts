import { sanitizeMessage, sanitizeSingleLine } from "@/lib/contactSanitize";

export const CONTACT_FIELD_MAX = { name: 200, email: 320, phone: 40, subject: 200, message: 8000 } as const;

export type ContactPayload = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

export function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/** Optional field: empty is OK; if present, allow typical international phone characters. */
export function isValidOptionalPhone(s: string) {
  if (!s) return true;
  if (s.length < 7) return false;
  return /^[\d+()\-.\s]+$/.test(s);
}

/** Hidden field; must stay empty (bots often fill it). */
export function isHoneypotTriggered(body: Record<string, unknown>): boolean {
  const v = body.website;
  if (v === undefined || v === null) return false;
  if (typeof v !== "string") return true;
  return v.trim().length > 0;
}

export function parseContactPayload(body: unknown): { ok: true; data: ContactPayload } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid body" };
  }
  const o = body as Record<string, unknown>;

  const name = sanitizeSingleLine(typeof o.name === "string" ? o.name : "", CONTACT_FIELD_MAX.name);
  const email = sanitizeSingleLine(typeof o.email === "string" ? o.email : "", CONTACT_FIELD_MAX.email).toLowerCase();
  const phone = sanitizeSingleLine(typeof o.phone === "string" ? o.phone : "", CONTACT_FIELD_MAX.phone);
  const subject = sanitizeSingleLine(typeof o.subject === "string" ? o.subject : "", CONTACT_FIELD_MAX.subject);
  const message = sanitizeMessage(typeof o.message === "string" ? o.message : "", CONTACT_FIELD_MAX.message);

  if (!name) {
    return { ok: false, error: "Invalid name" };
  }
  if (!email || !isValidEmail(email)) {
    return { ok: false, error: "Invalid email" };
  }
  if (!isValidOptionalPhone(phone)) {
    return { ok: false, error: "Invalid phone" };
  }
  if (!subject) {
    return { ok: false, error: "Invalid subject" };
  }
  if (!message) {
    return { ok: false, error: "Invalid message" };
  }

  return { ok: true, data: { name, email, phone, subject, message } };
}
