import crypto from "crypto";
import * as React from "react";
import {
  accraDateAndTimeToIso,
  formatConsultationAppointmentLocal,
  formatPreferredSlotAccra,
  isoToAccraDateAndTime,
} from "./formatConsultationAppointment";

export const PRIMARY_ADMIN_EMAIL = "joeythebrandonline@gmail.com";
export const DEFAULT_ADMIN_CONSULTATIONS_URL =
  "https://admin.joeythebrand.com/content/consultations";
export const DEFAULT_APPOINTMENTS_SENDER = "appointments@joeythebrand.com";

function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

export type ConsultationWorkflowStatus =
  | "pending"
  | "reschedule_proposed"
  | "confirmed"
  | "declined"
  | "cancelled";

export interface ConsultationRow {
  id: string;
  user_id?: string | null;
  source?: "shop" | "portfolio" | string;
  portfolio_access_token?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  service: string;
  preferred_date?: string | null;
  preferred_time?: string | null;
  notes?: string | null;
  status: ConsultationWorkflowStatus;
  booking_code?: string | null;
  scheduled_at?: string | null;
  proposed_scheduled_at?: string | null;
  proposed_date?: string | null;
  proposed_time?: string | null;
  reschedule_note?: string | null;
  reschedule_proposed_at?: string | null;
  customer_reschedule_response?: string | null;
  customer_responded_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  refund_review_required?: boolean | null;
  refund_review_status?: string | null;
  duration_hours?: number | null;
  price_ghs?: number | null;
  payment_status?: string | null;
  payment_ref?: string | null;
  state_history?: Array<Record<string, unknown>> | null;
  created_at?: string;
  updated_at?: string;
}

export interface EmailMessage {
  from: string;
  to: string | string[];
  replyTo?: string;
  subject: string;
  react: React.ReactElement;
}

export interface EmailSender {
  send(msg: EmailMessage): Promise<{ data?: { id?: string } | null; error?: { message?: string } | null }>;
}

export interface PaystackVerifyResult {
  ok: boolean;
  status?: boolean;
  message?: string;
  data?: {
    status?: string;
    reference?: string;
    amount?: number;
    currency?: string;
    metadata?: {
      bookingId?: string;
      booking_id?: string;
      custom_fields?: Array<{
        variable_name?: string;
        value?: string;
      }>;
    };
  };
}

export type PaystackVerifier = (
  reference: string,
  secretKey: string,
) => Promise<PaystackVerifyResult>;

export function getAppointmentsAdminEmail(): string {
  return (
    process.env.APPOINTMENTS_ADMIN_EMAIL?.trim() ||
    process.env.ORDERS_ADMIN_EMAIL?.trim() ||
    process.env.CONTACT_TO_EMAIL?.trim() ||
    PRIMARY_ADMIN_EMAIL
  );
}

export function getAdminConsultationsUrl(): string {
  return (
    process.env.ADMIN_CONSULTATIONS_URL?.trim() ||
    DEFAULT_ADMIN_CONSULTATIONS_URL
  );
}

export function getAppointmentsFromEmail(): string {
  return (
    process.env.RESEND_APPOINTMENTS_EMAIL?.trim() ||
    DEFAULT_APPOINTMENTS_SENDER
  );
}

export function getConsultationTokenSecret(): string {
  const secret =
    process.env.CONSULTATION_TOKEN_SECRET?.trim() ||
    process.env.SEND_EMAIL_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.PAYSTACK_SECRET_KEY?.trim();
  if (secret) return secret;
  if (isProd()) {
    throw new Error("CONSULTATION_TOKEN_SECRET or SUPABASE_SERVICE_ROLE_KEY is required in production.");
  }
  return "joey-consultation-dev-secret";
}

export function getRescheduleTokenTtlMs(): number {
  const hours = Number(process.env.RESCHEDULE_TOKEN_TTL_HOURS || 72);
  const validHours = Number.isFinite(hours) && hours > 0 ? hours : 72;
  return Math.round(validHours * 60 * 60 * 1000);
}

// ── Signed, Expiring, Single-Use Reschedule Tokens ────────────────────────────

export interface RescheduleTokenPayload {
  bid: string;
  psa: string;
  exp: number;
  jti: string;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

export function createRescheduleToken(params: {
  bookingId: string;
  proposedScheduledAt: string;
  secret?: string;
  ttlMs?: number;
  nowMs?: number;
  jti?: string;
}): {
  token: string;
  tokenHash: string;
  jti: string;
  expiresAtIso: string;
  payload: RescheduleTokenPayload;
} {
  const secret = params.secret || getConsultationTokenSecret();
  const nowMs = params.nowMs ?? Date.now();
  const ttlMs = params.ttlMs ?? getRescheduleTokenTtlMs();
  const exp = nowMs + ttlMs;
  const jti = params.jti || crypto.randomUUID();

  const normalizedPsa = new Date(params.proposedScheduledAt).toISOString();
  const payload: RescheduleTokenPayload = {
    bid: params.bookingId,
    psa: normalizedPsa,
    exp,
    jti,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sigB64 = crypto
    .createHmac("sha256", secret)
    .update(payloadB64, "utf8")
    .digest("base64url");
  const token = `${payloadB64}.${sigB64}`;

  return {
    token,
    tokenHash: hashToken(token),
    jti,
    expiresAtIso: new Date(exp).toISOString(),
    payload,
  };
}

export function verifyRescheduleToken(
  token: string,
  opts?: { secret?: string; nowMs?: number },
):
  | { ok: true; payload: RescheduleTokenPayload; tokenHash: string }
  | { ok: false; code: "invalid_token" | "expired_token"; error: string } {
  const raw = String(token || "").trim();
  if (!raw || !raw.includes(".")) {
    return { ok: false, code: "invalid_token", error: "Invalid reschedule link." };
  }
  const parts = raw.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, code: "invalid_token", error: "Invalid reschedule link." };
  }

  const [payloadB64, sigB64] = parts;
  const secret = opts?.secret || getConsultationTokenSecret();
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(payloadB64, "utf8")
    .digest("base64url");

  const a = Buffer.from(sigB64, "utf8");
  const b = Buffer.from(expectedSig, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, code: "invalid_token", error: "Invalid or tampered reschedule link." };
  }

  let parsed: RescheduleTokenPayload;
  try {
    parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as RescheduleTokenPayload;
  } catch {
    return { ok: false, code: "invalid_token", error: "Malformed reschedule token." };
  }

  if (
    !parsed ||
    typeof parsed.bid !== "string" ||
    !parsed.bid ||
    typeof parsed.psa !== "string" ||
    !parsed.psa ||
    typeof parsed.exp !== "number" ||
    typeof parsed.jti !== "string" ||
    !parsed.jti
  ) {
    return { ok: false, code: "invalid_token", error: "Invalid reschedule token payload." };
  }

  const nowMs = opts?.nowMs ?? Date.now();
  if (nowMs > parsed.exp) {
    return {
      ok: false,
      code: "expired_token",
      error: "This reschedule link has expired. Please contact us or request a new proposal.",
    };
  }

  return {
    ok: true,
    payload: parsed,
    tokenHash: hashToken(raw),
  };
}

export const defaultPaystackVerifier: PaystackVerifier = async (
  reference: string,
  secretKey: string,
): Promise<PaystackVerifyResult> => {
  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${secretKey}` },
    },
  );
  const data = (await res.json()) as PaystackVerifyResult;
  return {
    ok: res.ok,
    status: data?.status,
    message: data?.message,
    data: data?.data,
  };
};

export async function recordStateTransition(
  supabaseAdmin: any,
  params: {
    bookingId: string;
    fromStatus: string | null;
    toStatus: string;
    actor: string;
    note?: string;
    metadata?: Record<string, unknown>;
    existingHistory?: Array<Record<string, unknown>> | null;
  },
): Promise<Array<Record<string, unknown>>> {
  const timestamp = new Date().toISOString();
  const entry = {
    fromStatus: params.fromStatus,
    toStatus: params.toStatus,
    actor: params.actor,
    note: params.note || null,
    metadata: params.metadata || {},
    timestamp,
  };

  const nextHistory = [
    ...(Array.isArray(params.existingHistory) ? params.existingHistory : []),
    entry,
  ];

  const { error: trErr } = await supabaseAdmin.from("consultation_state_transitions").insert({
    booking_id: params.bookingId,
    from_status: params.fromStatus,
    to_status: params.toStatus,
    actor: params.actor,
    note: params.note || null,
    metadata: params.metadata || {},
    created_at: timestamp,
  });

  if (trErr && isProd()) {
    throw new Error(`Failed to record consultation state transition: ${trErr.message}`);
  }

  const { error: histErr } = await supabaseAdmin
    .from("consultation_bookings")
    .update({ state_history: nextHistory })
    .eq("id", params.bookingId);

  if (histErr && isProd()) {
    throw new Error(`Failed to update booking state_history: ${histErr.message}`);
  }

  return nextHistory;
}

export async function dispatchTrackedNotification(
  supabaseAdmin: any,
  emailSender: EmailSender,
  params: {
    bookingId: string;
    eventKey: string;
    recipient: string;
    message: EmailMessage;
  },
): Promise<{
  sent: boolean;
  skipped: boolean;
  attemptCount: number;
  error?: string;
}> {
  const { data: existingRow, error: fetchErr } = await supabaseAdmin
    .from("consultation_notification_attempts")
    .select("id, status, attempt_count")
    .eq("booking_id", params.bookingId)
    .eq("event_key", params.eventKey)
    .maybeSingle();

  if (fetchErr) {
    if (isProd()) {
      throw new Error(`Notification tracking query failed: ${fetchErr.message}`);
    }
  }

  if (existingRow?.status === "sent") {
    return {
      sent: false,
      skipped: true,
      attemptCount: Number(existingRow.attempt_count || 1),
    };
  }

  const nextAttemptCount = existingRow ? Number(existingRow.attempt_count || 0) + 1 : 1;
  let attemptRowId: string | undefined = existingRow?.id;

  if (existingRow) {
    const { error: updErr } = await supabaseAdmin
      .from("consultation_notification_attempts")
      .update({
        status: "sending",
        attempt_count: nextAttemptCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingRow.id);

    if (updErr && isProd()) {
      throw new Error(`Failed to update notification attempt: ${updErr.message}`);
    }
  } else {
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("consultation_notification_attempts")
      .insert({
        booking_id: params.bookingId,
        event_key: params.eventKey,
        recipient: params.recipient,
        status: "sending",
        attempt_count: 1,
      })
      .select("id, status, attempt_count")
      .single();

    if (insErr) {
      if (/duplicate key|unique/i.test(insErr.message || "")) {
        return {
          sent: false,
          skipped: true,
          attemptCount: nextAttemptCount,
        };
      }
      if (isProd()) {
        throw new Error(`Failed to create notification attempt record: ${insErr.message}`);
      }
    }
    attemptRowId = inserted?.id;
  }

  try {
    const res = await emailSender.send(params.message);
    if (res?.error) {
      throw new Error(res.error.message || "Resend error");
    }

    const providerId = res?.data?.id || null;
    if (attemptRowId) {
      await supabaseAdmin
        .from("consultation_notification_attempts")
        .update({
          status: "sent",
          provider_message_id: providerId,
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", attemptRowId);
    }

    return {
      sent: true,
      skipped: false,
      attemptCount: nextAttemptCount,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);

    if (attemptRowId) {
      await supabaseAdmin
        .from("consultation_notification_attempts")
        .update({
          status: "failed",
          last_error: errMsg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", attemptRowId);
    }

    return {
      sent: false,
      skipped: false,
      attemptCount: nextAttemptCount,
      error: errMsg,
    };
  }
}

export async function checkSlotAvailabilityAccra(
  supabaseAdmin: any,
  targetScheduledAtIso: string,
  excludeBookingId?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const accra = isoToAccraDateAndTime(targetScheduledAtIso);
  if (!accra) {
    return { ok: false, error: "Invalid appointment date or time." };
  }

  const targetDay = accra.date;
  const canonicalTargetMs = new Date(targetScheduledAtIso).getTime();

  let maxSlots = 5;
  const { data: dayRule, error: ruleErr } = await supabaseAdmin
    .from("consultation_day_rules")
    .select("max_slots_per_day")
    .eq("day", targetDay)
    .maybeSingle();

  if (ruleErr && isProd()) {
    return { ok: false, error: "Could not verify calendar day rules." };
  }

  if (dayRule && Number.isFinite(Number(dayRule.max_slots_per_day))) {
    maxSlots = Number(dayRule.max_slots_per_day);
  } else {
    const { data: settings, error: settingsErr } = await supabaseAdmin
      .from("consultation_settings")
      .select("max_slots_per_day")
      .eq("id", 1)
      .maybeSingle();
    if (settingsErr && isProd()) {
      return { ok: false, error: "Could not verify consultation settings." };
    }
    if (settings && Number.isFinite(Number(settings.max_slots_per_day))) {
      maxSlots = Number(settings.max_slots_per_day);
    }
  }

  const { data: confirmedRows, error } = await supabaseAdmin
    .from("consultation_bookings")
    .select("id, scheduled_at, status")
    .eq("status", "confirmed");

  if (error) {
    return { ok: false, error: "Could not verify calendar availability." };
  }

  let dayCount = 0;
  for (const row of confirmedRows || []) {
    if (excludeBookingId && row.id === excludeBookingId) continue;
    if (!row.scheduled_at) continue;
    const rowMs = new Date(row.scheduled_at).getTime();
    if (rowMs === canonicalTargetMs) {
      return {
        ok: false,
        error: "That exact time slot is already booked by another confirmed appointment.",
      };
    }
    const rowAccra = isoToAccraDateAndTime(row.scheduled_at);
    if (rowAccra?.date === targetDay) {
      dayCount += 1;
    }
  }

  if (dayCount >= maxSlots) {
    return {
      ok: false,
      error: "That day already has the maximum number of confirmed consultations.",
    };
  }

  return { ok: true };
}

export async function verifyAdminRequest(
  req: Request,
  supabaseAdmin: any,
  supabaseAnon?: any,
): Promise<{ ok: true; adminEmail: string } | { ok: false; status: number; error: string }> {
  const adminSecretHeader = req.headers.get("x-admin-secret")?.trim() || "";
  const configuredSecret =
    process.env.ADMIN_API_SECRET?.trim() || process.env.SEND_EMAIL_SECRET?.trim() || "";

  if (configuredSecret && adminSecretHeader && adminSecretHeader === configuredSecret) {
    return { ok: true, adminEmail: "system:secret" };
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token) {
    return { ok: false, status: 401, error: "Missing authorization token." };
  }

  if (configuredSecret && token === configuredSecret) {
    return { ok: true, adminEmail: "system:secret" };
  }

  const authClient = supabaseAnon || supabaseAdmin;
  const { data: who, error: whoErr } = await authClient.auth.getUser(token);
  const email = String(who?.user?.email || "")
    .trim()
    .toLowerCase();

  if (whoErr || !email) {
    return { ok: false, status: 401, error: "Unauthorized admin session." };
  }

  if (email === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
    return { ok: true, adminEmail: email };
  }

  const { data: opRow, error: opErr } = await supabaseAdmin
    .from("admin_operator_emails")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  if (opErr) {
    return { ok: false, status: 500, error: "Could not verify admin operator permissions." };
  }

  if (opRow?.email) {
    return { ok: true, adminEmail: email };
  }

  return { ok: false, status: 403, error: "Forbidden: not an authorized dashboard operator." };
}

export async function verifyConsultationPaystackAndNotify(params: {
  supabaseAdmin: any;
  emailSender: EmailSender;
  renderEmail: (props: any) => React.ReactElement;
  brandFromName: string;
  reference: string;
  bookingId?: string;
  defaultExpectedGhs?: number;
  paystackSecretKey: string;
  verifyPaystack?: PaystackVerifier;
  getSlipUrl?: (row: ConsultationRow) => string | undefined;
}): Promise<{
  ok: boolean;
  status: number;
  error?: string;
  details?: string;
  amount?: number;
  alreadyPaid?: boolean;
  notifications?: {
    customerSent: boolean;
    customerSkipped: boolean;
    adminSent: boolean;
    adminSkipped: boolean;
    errors: string[];
  };
}> {
  const ref = String(params.reference || "").trim();
  const explicitId = String(params.bookingId || "").trim();

  if (!ref) {
    return { ok: false, status: 400, error: "Missing payment reference." };
  }

  let booking: ConsultationRow | null = null;
  if (explicitId) {
    const { data, error } = await params.supabaseAdmin
      .from("consultation_bookings")
      .select("*")
      .eq("id", explicitId)
      .maybeSingle();
    if (error || !data) {
      return { ok: false, status: 404, error: "Consultation booking not found." };
    }
    booking = data as ConsultationRow;
  } else {
    const { data, error } = await params.supabaseAdmin
      .from("consultation_bookings")
      .select("*")
      .eq("payment_ref", ref)
      .maybeSingle();
    if (error || !data) {
      return { ok: false, status: 404, error: "Consultation booking not found for reference." };
    }
    booking = data as ConsultationRow;
  }

  if (booking.payment_ref && booking.payment_ref.trim() !== "" && booking.payment_ref.trim() !== ref) {
    return {
      ok: false,
      status: 400,
      error: "Payment reference does not match the booking's recorded reference.",
    };
  }

  const { data: conflictingBooking } = await params.supabaseAdmin
    .from("consultation_bookings")
    .select("id")
    .eq("payment_ref", ref)
    .neq("id", booking.id)
    .maybeSingle();

  if (conflictingBooking?.id) {
    return {
      ok: false,
      status: 409,
      error: "This payment reference has already been used for another booking.",
    };
  }

  const verifier = params.verifyPaystack || defaultPaystackVerifier;
  const verifyResult = await verifier(ref, params.paystackSecretKey);
  const tx = verifyResult.data;

  if (!verifyResult.ok || !verifyResult.status || tx?.status !== "success") {
    const failedStatus = tx?.status === "failed" ? "failed" : "pending";
    if (booking.payment_status !== "paid") {
      await params.supabaseAdmin
        .from("consultation_bookings")
        .update({
          payment_status: failedStatus,
          payment_ref: ref,
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id);
    }
    return {
      ok: false,
      status: 400,
      error: "Payment verification failed",
      details: verifyResult.message || "Transaction was not successful.",
    };
  }

  if (tx.currency && String(tx.currency).toUpperCase() !== "GHS") {
    return {
      ok: false,
      status: 400,
      error: `Invalid payment currency (${tx.currency}). Expected GHS.`,
    };
  }

  const expectedGhs =
    booking.price_ghs != null && Number(booking.price_ghs) > 0
      ? Number(booking.price_ghs)
      : params.defaultExpectedGhs;

  if (!expectedGhs || expectedGhs <= 0) {
    return {
      ok: false,
      status: 400,
      error: "Booking price is not configured.",
    };
  }

  const expectedPesewas = Math.round(expectedGhs * 100);

  if (tx.amount != null && Number(tx.amount) !== expectedPesewas) {
    return {
      ok: false,
      status: 400,
      error: `Payment amount mismatch. Expected ${expectedPesewas} pesewas, received ${tx.amount}.`,
    };
  }

  const metaBookingId =
    tx.metadata?.bookingId?.trim() ||
    tx.metadata?.booking_id?.trim() ||
    tx.metadata?.custom_fields?.find((f) => f.variable_name === "booking_id")?.value?.trim() ||
    "";

  if (metaBookingId && metaBookingId !== booking.id) {
    return {
      ok: false,
      status: 400,
      error: "Payment transaction metadata does not match this consultation booking.",
    };
  }

  const alreadyPaid = booking.payment_status === "paid";

  if (!alreadyPaid) {
    const { data: updated, error: updateErr } = await params.supabaseAdmin
      .from("consultation_bookings")
      .update({
        payment_status: "paid",
        payment_ref: ref,
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.id)
      .select("*")
      .single();

    if (updateErr || !updated) {
      return {
        ok: false,
        status: 500,
        error: "Failed to update booking payment status.",
        details: updateErr?.message,
      };
    }
    booking = updated as ConsultationRow;

    await recordStateTransition(params.supabaseAdmin, {
      bookingId: booking.id,
      fromStatus: booking.status,
      toStatus: booking.status,
      actor: "system:paystack",
      note: `Paystack payment verified (${ref})`,
      metadata: { reference: ref, amountPesewas: tx.amount ?? expectedPesewas, currency: "GHS" },
      existingHistory: booking.state_history,
    });
  }

  const errors: string[] = [];
  let customerSent = false;
  let customerSkipped = false;
  let adminSent = false;
  let adminSkipped = false;

  try {
    const fromEmail = getAppointmentsFromEmail();
    const adminEmail = getAppointmentsAdminEmail();
    const adminConsultationsUrl = getAdminConsultationsUrl();
    const slipUrl = params.getSlipUrl ? params.getSlipUrl(booking) : undefined;
    const displayBookingCode = booking.booking_code || booking.id.slice(-8).toUpperCase();

    const commonEmailProps = {
      customerName: booking.customer_name || "Customer",
      customerEmail: booking.customer_email,
      customerPhone: booking.customer_phone || "",
      service: booking.service || "Bespoke Service",
      preferredDate: booking.preferred_date || "",
      preferredTime: booking.preferred_time || "",
      bookingCode: displayBookingCode,
      bookingReference: ref,
      paymentStatus: "paid",
      amountGhs: expectedGhs,
      status: "pending" as const,
      notes: booking.notes || "",
      slipUrl,
      adminConsultationsUrl,
    };

    if (booking.customer_email) {
      const custRes = await dispatchTrackedNotification(params.supabaseAdmin, params.emailSender, {
        bookingId: booking.id,
        eventKey: "paid_pending:customer",
        recipient: booking.customer_email,
        message: {
          from: `${params.brandFromName} <${fromEmail}>`,
          to: booking.customer_email,
          subject: "Bespoke Appointment Request - Pending Review",
          react: params.renderEmail({
            ...commonEmailProps,
            isAdmin: false,
          }),
        },
      });
      customerSent = custRes.sent;
      customerSkipped = custRes.skipped;
      if (custRes.error) errors.push(`customer: ${custRes.error}`);
    }

    if (adminEmail) {
      const admRes = await dispatchTrackedNotification(params.supabaseAdmin, params.emailSender, {
        bookingId: booking.id,
        eventKey: "paid_pending:admin",
        recipient: adminEmail,
        message: {
          from: `${params.brandFromName} <${fromEmail}>`,
          to: adminEmail,
          replyTo: booking.customer_email || undefined,
          subject: `New Consultation Request — ${booking.customer_name || "Customer"}`,
          react: params.renderEmail({
            ...commonEmailProps,
            isAdmin: true,
            adminEvent: "new_booking",
          }),
        },
      });
      adminSent = admRes.sent;
      adminSkipped = admRes.skipped;
      if (admRes.error) errors.push(`admin: ${admRes.error}`);
    }
  } catch (notifErr) {
    errors.push(notifErr instanceof Error ? notifErr.message : String(notifErr));
  }

  return {
    ok: true,
    status: 200,
    amount: tx.amount ?? expectedPesewas,
    alreadyPaid,
    notifications: {
      customerSent,
      customerSkipped,
      adminSent,
      adminSkipped,
      errors,
    },
  };
}

export async function handleAdminConsultationAction(params: {
  supabaseAdmin: any;
  emailSender: EmailSender;
  renderEmail: (props: any) => React.ReactElement;
  brandFromName: string;
  baseUrl: string;
  reschedulePath: string;
  adminEmail: string;
  bookingId: string;
  action?: "confirm" | "reschedule" | "cancel";
  scheduledAt?: string;
  proposedDate?: string;
  proposedTime?: string;
  proposedScheduledAt?: string;
  rescheduleNote?: string;
  cancellationReason?: string;
  getSlipUrl?: (row: ConsultationRow) => string | undefined;
}): Promise<{
  ok: boolean;
  status: number;
  error?: string;
  booking?: ConsultationRow;
  rescheduleToken?: string;
}> {
  const action = params.action || "confirm";
  const { data: rawBooking, error: fetchErr } = await params.supabaseAdmin
    .from("consultation_bookings")
    .select("*")
    .eq("id", params.bookingId)
    .maybeSingle();

  if (fetchErr || !rawBooking) {
    return { ok: false, status: 404, error: "Booking not found." };
  }

  let booking = rawBooking as ConsultationRow;
  const fromEmail = getAppointmentsFromEmail();
  const adminConsultationsUrl = getAdminConsultationsUrl();
  const slipUrl = params.getSlipUrl ? params.getSlipUrl(booking) : undefined;

  if (action === "confirm") {
    if (booking.status === "cancelled" || booking.status === "declined") {
      return {
        ok: false,
        status: 400,
        error: `Cannot confirm a ${booking.status} booking.`,
      };
    }

    if (booking.payment_status !== "paid") {
      return {
        ok: false,
        status: 400,
        error: "Cannot confirm a consultation booking unless payment is marked paid.",
      };
    }

    const targetScheduledAt = params.scheduledAt?.trim() || booking.scheduled_at?.trim() || "";
    if (!targetScheduledAt) {
      return {
        ok: false,
        status: 400,
        error: "Set an appointment date and time before confirming.",
      };
    }

    const availability = await checkSlotAvailabilityAccra(
      params.supabaseAdmin,
      targetScheduledAt,
      booking.id,
    );
    if (!availability.ok) {
      return { ok: false, status: 409, error: availability.error };
    }

    const finalCode =
      booking.booking_code && booking.booking_code.trim()
        ? booking.booking_code.trim()
        : `BSP-${Math.floor(100000 + Math.random() * 900000)}`;

    const prevStatus = booking.status;
    const nowIso = new Date().toISOString();

    const { data: updated, error: updErr } = await params.supabaseAdmin
      .from("consultation_bookings")
      .update({
        status: "confirmed",
        scheduled_at: targetScheduledAt,
        booking_code: finalCode,
        proposed_scheduled_at: null,
        proposed_date: null,
        proposed_time: null,
        updated_at: nowIso,
      })
      .eq("id", booking.id)
      .select("*")
      .maybeSingle();

    if (updErr || !updated) {
      return {
        ok: false,
        status: 400,
        error: updErr?.message || "Could not confirm consultation.",
      };
    }

    booking = updated as ConsultationRow;
    const finalBookingCode = booking.booking_code || finalCode;

    await recordStateTransition(params.supabaseAdmin, {
      bookingId: booking.id,
      fromStatus: prevStatus,
      toStatus: "confirmed",
      actor: `admin:${params.adminEmail}`,
      note: `Confirmed for ${formatConsultationAppointmentLocal(targetScheduledAt)}`,
      metadata: { scheduledAt: targetScheduledAt, bookingCode: finalBookingCode },
      existingHistory: booking.state_history,
    });

    if (booking.customer_email) {
      await dispatchTrackedNotification(params.supabaseAdmin, params.emailSender, {
        bookingId: booking.id,
        eventKey: `confirmed:customer:${targetScheduledAt}`,
        recipient: booking.customer_email,
        message: {
          from: `${params.brandFromName} <${fromEmail}>`,
          to: booking.customer_email,
          subject: `Bespoke Appointment Confirmed - ${finalBookingCode}`,
          react: params.renderEmail({
            customerName: booking.customer_name || "Customer",
            customerEmail: booking.customer_email,
            customerPhone: booking.customer_phone || "",
            service: booking.service || "Bespoke Service",
            preferredDate: booking.preferred_date || "",
            preferredTime: booking.preferred_time || "",
            scheduledAt: targetScheduledAt,
            bookingCode: finalBookingCode,
            bookingReference: booking.payment_ref || booking.id.slice(-8).toUpperCase(),
            paymentStatus: booking.payment_status || "paid",
            amountGhs: booking.price_ghs ?? undefined,
            status: "confirmed",
            notes: booking.notes || "",
            slipUrl,
            adminConsultationsUrl,
          }),
        },
      });
    }

    return { ok: true, status: 200, booking };
  }

  if (action === "reschedule") {
    if (booking.status === "cancelled" || booking.status === "declined") {
      return {
        ok: false,
        status: 400,
        error: `Cannot reschedule a ${booking.status} booking.`,
      };
    }

    if (booking.payment_status !== "paid") {
      return {
        ok: false,
        status: 400,
        error: "Cannot propose a reschedule unless payment is marked paid.",
      };
    }

    let proposedIso = params.proposedScheduledAt?.trim() || "";
    if (!proposedIso && params.proposedDate && params.proposedTime) {
      proposedIso = accraDateAndTimeToIso(params.proposedDate, params.proposedTime) || "";
    }
    if (!proposedIso) {
      return {
        ok: false,
        status: 400,
        error: "Please provide a valid proposed date and time (Africa/Accra).",
      };
    }

    const accraSlot = isoToAccraDateAndTime(proposedIso);
    if (!accraSlot) {
      return { ok: false, status: 400, error: "Invalid proposed appointment timestamp." };
    }

    const availability = await checkSlotAvailabilityAccra(
      params.supabaseAdmin,
      proposedIso,
      booking.id,
    );
    if (!availability.ok) {
      return { ok: false, status: 409, error: availability.error };
    }

    const tokenObj = createRescheduleToken({
      bookingId: booking.id,
      proposedScheduledAt: proposedIso,
    });

    const prevStatus = booking.status;
    const nowIso = new Date().toISOString();
    const noteClean = params.rescheduleNote?.trim() || null;

    const { data: updated, error: updErr } = await params.supabaseAdmin
      .from("consultation_bookings")
      .update({
        status: "reschedule_proposed",
        proposed_scheduled_at: proposedIso,
        proposed_date: accraSlot.date,
        proposed_time: accraSlot.time,
        reschedule_note: noteClean,
        reschedule_proposed_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", booking.id)
      .select("*")
      .maybeSingle();

    if (updErr || !updated) {
      return {
        ok: false,
        status: 400,
        error: updErr?.message || "Could not save reschedule proposal.",
      };
    }

    booking = updated as ConsultationRow;

    const { error: tokenInsErr } = await params.supabaseAdmin
      .from("consultation_action_tokens")
      .insert({
        booking_id: booking.id,
        token_hash: tokenObj.tokenHash,
        jti: tokenObj.jti,
        proposal_scheduled_at: proposedIso,
        expires_at: tokenObj.expiresAtIso,
      });

    if (tokenInsErr) {
      return {
        ok: false,
        status: 500,
        error: `Failed to persist reschedule action token: ${tokenInsErr.message}`,
      };
    }

    await recordStateTransition(params.supabaseAdmin, {
      bookingId: booking.id,
      fromStatus: prevStatus,
      toStatus: "reschedule_proposed",
      actor: `admin:${params.adminEmail}`,
      note: noteClean || `Proposed new slot: ${formatConsultationAppointmentLocal(proposedIso)}`,
      metadata: {
        proposedScheduledAt: proposedIso,
        proposedDate: accraSlot.date,
        proposedTime: accraSlot.time,
        rescheduleNote: noteClean,
        tokenHash: tokenObj.tokenHash,
        jti: tokenObj.jti,
        expiresAt: tokenObj.expiresAtIso,
      },
      existingHistory: booking.state_history,
    });

    const cleanBase = params.baseUrl.replace(/\/+$/, "");
    const acceptUrl = `${cleanBase}${params.reschedulePath}?token=${encodeURIComponent(tokenObj.token)}&intent=accept`;
    const requestAnotherUrl = `${cleanBase}${params.reschedulePath}?token=${encodeURIComponent(tokenObj.token)}&intent=another`;

    if (booking.customer_email) {
      await dispatchTrackedNotification(params.supabaseAdmin, params.emailSender, {
        bookingId: booking.id,
        eventKey: `reschedule_proposed:customer:${tokenObj.jti}`,
        recipient: booking.customer_email,
        message: {
          from: `${params.brandFromName} <${fromEmail}>`,
          to: booking.customer_email,
          subject: `Proposed New Time for Your Consultation — ${params.brandFromName}`,
          react: params.renderEmail({
            customerName: booking.customer_name || "Customer",
            customerEmail: booking.customer_email,
            customerPhone: booking.customer_phone || "",
            service: booking.service || "Bespoke Service",
            preferredDate: booking.preferred_date || "",
            preferredTime: booking.preferred_time || "",
            scheduledAt: booking.scheduled_at || "",
            proposedScheduledAt: proposedIso,
            bookingCode: booking.booking_code || "Pending Agreement",
            bookingReference: booking.payment_ref || booking.id.slice(-8).toUpperCase(),
            paymentStatus: booking.payment_status || "paid",
            amountGhs: booking.price_ghs ?? undefined,
            status: "reschedule_proposed",
            notes: booking.notes || "",
            rescheduleNote: noteClean || "",
            acceptRescheduleUrl: acceptUrl,
            requestAnotherTimeUrl: requestAnotherUrl,
            slipUrl,
            adminConsultationsUrl,
          }),
        },
      });
    }

    return {
      ok: true,
      status: 200,
      booking,
      rescheduleToken: tokenObj.token,
    };
  }

  if (action === "cancel") {
    if (booking.status === "cancelled") {
      return { ok: false, status: 400, error: "Booking is already cancelled." };
    }

    const prevStatus = booking.status;
    const nowIso = new Date().toISOString();
    const reasonClean = params.cancellationReason?.trim() || null;
    const isPaid = booking.payment_status === "paid";

    const { data: updated, error: updErr } = await params.supabaseAdmin
      .from("consultation_bookings")
      .update({
        status: "cancelled",
        booking_code: null,
        scheduled_at: null,
        proposed_scheduled_at: null,
        proposed_date: null,
        proposed_time: null,
        cancelled_at: nowIso,
        cancellation_reason: reasonClean,
        refund_review_required: isPaid,
        refund_review_status: isPaid ? "pending_review" : null,
        updated_at: nowIso,
      })
      .eq("id", booking.id)
      .select("*")
      .maybeSingle();

    if (updErr || !updated) {
      return {
        ok: false,
        status: 400,
        error: updErr?.message || "Could not cancel booking.",
      };
    }

    booking = updated as ConsultationRow;

    await recordStateTransition(params.supabaseAdmin, {
      bookingId: booking.id,
      fromStatus: prevStatus,
      toStatus: "cancelled",
      actor: `admin:${params.adminEmail}`,
      note: reasonClean || "Cancelled by admin",
      metadata: {
        cancellationReason: reasonClean,
        refundReviewRequired: isPaid,
        refundReviewStatus: isPaid ? "pending_review" : null,
      },
      existingHistory: booking.state_history,
    });

    if (booking.customer_email) {
      await dispatchTrackedNotification(params.supabaseAdmin, params.emailSender, {
        bookingId: booking.id,
        eventKey: "cancelled:customer",
        recipient: booking.customer_email,
        message: {
          from: `${params.brandFromName} <${fromEmail}>`,
          to: booking.customer_email,
          subject: `Consultation Cancelled — ${params.brandFromName}`,
          react: params.renderEmail({
            customerName: booking.customer_name || "Customer",
            customerEmail: booking.customer_email,
            customerPhone: booking.customer_phone || "",
            service: booking.service || "Bespoke Service",
            preferredDate: booking.preferred_date || "",
            preferredTime: booking.preferred_time || "",
            bookingCode: "Cancelled",
            bookingReference: booking.payment_ref || booking.id.slice(-8).toUpperCase(),
            paymentStatus: booking.payment_status || "unpaid",
            amountGhs: booking.price_ghs ?? undefined,
            status: "cancelled",
            notes: booking.notes || "",
            cancellationReason: reasonClean || "",
            refundReviewRequired: isPaid,
            slipUrl,
            adminConsultationsUrl,
          }),
        },
      });
    }

    return { ok: true, status: 200, booking };
  }

  return { ok: false, status: 400, error: "Unsupported action." };
}

export async function inspectRescheduleProposalToken(params: {
  supabaseAdmin: any;
  token: string;
  secret?: string;
  nowMs?: number;
}): Promise<
  | {
      ok: true;
      booking: ConsultationRow;
      payload: RescheduleTokenPayload;
      tokenHash: string;
      proposedFormatted: string;
      preferredFormatted: string;
    }
  | {
      ok: false;
      status: number;
      code: string;
      error: string;
    }
> {
  const verified = verifyRescheduleToken(params.token, {
    secret: params.secret,
    nowMs: params.nowMs,
  });

  if (!verified.ok) {
    return {
      ok: false,
      status: 400,
      code: verified.code,
      error: verified.error,
    };
  }

  const { payload, tokenHash } = verified;

  const { data: tokenRow, error: tokErr } = await params.supabaseAdmin
    .from("consultation_action_tokens")
    .select("used_at, used_action, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (tokErr && isProd()) {
    return {
      ok: false,
      status: 500,
      code: "token_lookup_failed",
      error: "Could not verify reschedule token state.",
    };
  }

  if (tokenRow?.used_at) {
    return {
      ok: false,
      status: 409,
      code: "token_already_used",
      error: "This reschedule response link has already been used.",
    };
  }

  const { data: rawBooking, error } = await params.supabaseAdmin
    .from("consultation_bookings")
    .select("*")
    .eq("id", payload.bid)
    .maybeSingle();

  if (error || !rawBooking) {
    return {
      ok: false,
      status: 404,
      code: "booking_not_found",
      error: "Consultation booking not found.",
    };
  }

  const booking = rawBooking as ConsultationRow;

  const history = Array.isArray(booking.state_history) ? booking.state_history : [];
  if (history.some((h) => (h?.metadata as any)?.usedTokenHash === tokenHash)) {
    return {
      ok: false,
      status: 409,
      code: "token_already_used",
      error: "This reschedule response link has already been used.",
    };
  }

  if (booking.status !== "reschedule_proposed") {
    return {
      ok: false,
      status: 409,
      code: "invalid_state",
      error:
        booking.status === "confirmed"
          ? "This consultation is already confirmed."
          : booking.status === "cancelled" || booking.status === "declined"
            ? "This consultation has been cancelled."
            : "This reschedule proposal is no longer active.",
    };
  }

  if (booking.proposed_scheduled_at) {
    const bookingPsaMs = new Date(booking.proposed_scheduled_at).getTime();
    const tokenPsaMs = new Date(payload.psa).getTime();
    if (bookingPsaMs !== tokenPsaMs) {
      return {
        ok: false,
        status: 409,
        code: "superseded_proposal",
        error: "A newer reschedule time has been proposed. Please use the latest email link.",
      };
    }
  }

  return {
    ok: true,
    booking,
    payload,
    tokenHash,
    proposedFormatted: formatConsultationAppointmentLocal(payload.psa),
    preferredFormatted: formatPreferredSlotAccra(booking.preferred_date, booking.preferred_time),
  };
}

export async function respondToRescheduleProposal(params: {
  supabaseAdmin: any;
  emailSender: EmailSender;
  renderEmail: (props: any) => React.ReactElement;
  brandFromName: string;
  token: string;
  action: "accept" | "request_another_time";
  preferredDate?: string;
  preferredTime?: string;
  message?: string;
  secret?: string;
  nowMs?: number;
  getSlipUrl?: (row: ConsultationRow) => string | undefined;
}): Promise<{
  ok: boolean;
  status: number;
  code?: string;
  error?: string;
  booking?: ConsultationRow;
}> {
  const inspected = await inspectRescheduleProposalToken({
    supabaseAdmin: params.supabaseAdmin,
    token: params.token,
    secret: params.secret,
    nowMs: params.nowMs,
  });

  if (!inspected.ok) {
    return {
      ok: false,
      status: inspected.status,
      code: inspected.code,
      error: inspected.error,
    };
  }

  const { booking, payload, tokenHash } = inspected;
  const fromEmail = getAppointmentsFromEmail();
  const adminEmail = getAppointmentsAdminEmail();
  const adminConsultationsUrl = getAdminConsultationsUrl();
  const slipUrl = params.getSlipUrl ? params.getSlipUrl(booking) : undefined;
  const nowIso = new Date(params.nowMs ?? Date.now()).toISOString();

  if (params.action === "accept") {
    if (booking.payment_status !== "paid") {
      return {
        ok: false,
        status: 400,
        code: "unpaid",
        error: "Cannot confirm booking before payment is verified.",
      };
    }

    const availability = await checkSlotAvailabilityAccra(
      params.supabaseAdmin,
      payload.psa,
      booking.id,
    );
    if (!availability.ok) {
      return {
        ok: false,
        status: 409,
        code: "slot_conflict",
        error: availability.error,
      };
    }

    const finalCode =
      booking.booking_code && booking.booking_code.trim()
        ? booking.booking_code.trim()
        : `BSP-${Math.floor(100000 + Math.random() * 900000)}`;

    const { data: updated, error: updErr } = await params.supabaseAdmin
      .from("consultation_bookings")
      .update({
        status: "confirmed",
        scheduled_at: payload.psa,
        booking_code: finalCode,
        proposed_scheduled_at: null,
        customer_reschedule_response: "Accepted proposed date and time",
        customer_responded_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", booking.id)
      .eq("status", "reschedule_proposed")
      .select("*")
      .maybeSingle();

    if (updErr || !updated) {
      return {
        ok: false,
        status: 409,
        code: "concurrent_modification",
        error: updErr?.message || "This reschedule proposal could not be confirmed (it may have already been processed).",
      };
    }

    const { error: tokUpdErr } = await params.supabaseAdmin
      .from("consultation_action_tokens")
      .update({
        used_at: nowIso,
        used_action: "accept",
        response_note: "Accepted proposed date and time",
      })
      .eq("token_hash", tokenHash);

    if (tokUpdErr && isProd()) {
      throw new Error(`Failed to mark action token used: ${tokUpdErr.message}`);
    }

    const confirmedBooking = updated as ConsultationRow;
    const issuedCode = confirmedBooking.booking_code || finalCode;

    await recordStateTransition(params.supabaseAdmin, {
      bookingId: booking.id,
      fromStatus: "reschedule_proposed",
      toStatus: "confirmed",
      actor: "customer:token",
      note: `Customer accepted proposed slot: ${formatConsultationAppointmentLocal(payload.psa)}`,
      metadata: {
        usedTokenHash: tokenHash,
        jti: payload.jti,
        scheduledAt: payload.psa,
        bookingCode: issuedCode,
      },
      existingHistory: booking.state_history,
    });

    const emailProps = {
      customerName: confirmedBooking.customer_name || "Customer",
      customerEmail: confirmedBooking.customer_email,
      customerPhone: confirmedBooking.customer_phone || "",
      service: confirmedBooking.service || "Bespoke Service",
      preferredDate: confirmedBooking.preferred_date || "",
      preferredTime: confirmedBooking.preferred_time || "",
      scheduledAt: payload.psa,
      bookingCode: issuedCode,
      bookingReference: confirmedBooking.payment_ref || confirmedBooking.id.slice(-8).toUpperCase(),
      paymentStatus: confirmedBooking.payment_status || "paid",
      amountGhs: confirmedBooking.price_ghs ?? undefined,
      status: "confirmed" as const,
      notes: confirmedBooking.notes || "",
      slipUrl,
      adminConsultationsUrl,
    };

    if (confirmedBooking.customer_email) {
      await dispatchTrackedNotification(params.supabaseAdmin, params.emailSender, {
        bookingId: booking.id,
        eventKey: `reschedule_accepted:customer:${payload.jti}`,
        recipient: confirmedBooking.customer_email,
        message: {
          from: `${params.brandFromName} <${fromEmail}>`,
          to: confirmedBooking.customer_email,
          subject: `Bespoke Appointment Confirmed - ${issuedCode}`,
          react: params.renderEmail({
            ...emailProps,
            isAdmin: false,
          }),
        },
      });
    }

    if (adminEmail) {
      await dispatchTrackedNotification(params.supabaseAdmin, params.emailSender, {
        bookingId: booking.id,
        eventKey: `reschedule_accepted:admin:${payload.jti}`,
        recipient: adminEmail,
        message: {
          from: `${params.brandFromName} <${fromEmail}>`,
          to: adminEmail,
          replyTo: confirmedBooking.customer_email || undefined,
          subject: `Reschedule Accepted — ${confirmedBooking.customer_name} (${issuedCode})`,
          react: params.renderEmail({
            ...emailProps,
            isAdmin: true,
            adminEvent: "reschedule_accepted",
          }),
        },
      });
    }

    return {
      ok: true,
      status: 200,
      booking: confirmedBooking,
    };
  }

  if (params.action === "request_another_time") {
    const prefDate = params.preferredDate?.trim().slice(0, 10) || "";
    const prefTime = params.preferredTime?.trim() || "";
    const msg = params.message?.trim() || "";

    if (!prefDate && !msg) {
      return {
        ok: false,
        status: 400,
        code: "missing_response",
        error: "Please share your preferred date/time or a note so we can schedule your session.",
      };
    }

    const parts: string[] = [];
    if (prefDate) {
      parts.push(`Requested slot: ${formatPreferredSlotAccra(prefDate, prefTime || undefined)}`);
    }
    if (msg) {
      parts.push(`Message: ${msg}`);
    }
    const summaryText = parts.join(" — ");

    const nextPreferredDate = prefDate || booking.preferred_date || null;
    const nextPreferredTime = prefDate ? prefTime || booking.preferred_time || null : booking.preferred_time || null;

    const { data: updated, error: updErr } = await params.supabaseAdmin
      .from("consultation_bookings")
      .update({
        status: "pending",
        preferred_date: nextPreferredDate,
        preferred_time: nextPreferredTime,
        proposed_scheduled_at: null,
        customer_reschedule_response: summaryText,
        customer_responded_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", booking.id)
      .eq("status", "reschedule_proposed")
      .select("*")
      .maybeSingle();

    if (updErr || !updated) {
      return {
        ok: false,
        status: 409,
        code: "concurrent_modification",
        error: updErr?.message || "Could not submit your request (it may have already been processed).",
      };
    }

    const { error: tokUpdErr } = await params.supabaseAdmin
      .from("consultation_action_tokens")
      .update({
        used_at: nowIso,
        used_action: "request_another_time",
        response_note: summaryText,
      })
      .eq("token_hash", tokenHash);

    if (tokUpdErr && isProd()) {
      throw new Error(`Failed to mark action token used: ${tokUpdErr.message}`);
    }

    const updatedBooking = updated as ConsultationRow;

    await recordStateTransition(params.supabaseAdmin, {
      bookingId: booking.id,
      fromStatus: "reschedule_proposed",
      toStatus: "pending",
      actor: "customer:token",
      note: summaryText,
      metadata: {
        usedTokenHash: tokenHash,
        jti: payload.jti,
        preferredDate: prefDate || undefined,
        preferredTime: prefTime || undefined,
        message: msg || undefined,
      },
      existingHistory: booking.state_history,
    });

    if (adminEmail) {
      await dispatchTrackedNotification(params.supabaseAdmin, params.emailSender, {
        bookingId: booking.id,
        eventKey: `reschedule_counter:admin:${payload.jti}`,
        recipient: adminEmail,
        message: {
          from: `${params.brandFromName} <${fromEmail}>`,
          to: adminEmail,
          replyTo: updatedBooking.customer_email || undefined,
          subject: `Customer Requested Another Time — ${updatedBooking.customer_name}`,
          react: params.renderEmail({
            customerName: updatedBooking.customer_name || "Customer",
            customerEmail: updatedBooking.customer_email,
            customerPhone: updatedBooking.customer_phone || "",
            service: updatedBooking.service || "Bespoke Service",
            preferredDate: updatedBooking.preferred_date || "",
            preferredTime: updatedBooking.preferred_time || "",
            bookingCode: "Pending Review",
            bookingReference: updatedBooking.payment_ref || updatedBooking.id.slice(-8).toUpperCase(),
            paymentStatus: updatedBooking.payment_status || "paid",
            amountGhs: updatedBooking.price_ghs ?? undefined,
            status: "pending",
            notes: updatedBooking.notes || "",
            customerRescheduleResponse: summaryText,
            isAdmin: true,
            adminEvent: "counter_request",
            adminConsultationsUrl,
          }),
        },
      });
    }

    return {
      ok: true,
      status: 200,
      booking: updatedBooking,
    };
  }

  return {
    ok: false,
    status: 400,
    code: "invalid_action",
    error: "Invalid response action.",
  };
}
