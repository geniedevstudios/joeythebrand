import { Text } from "@react-email/components";
import * as React from "react";
import { getEmailBaseUrl } from "@/lib/emailAssets";
import {
  formatConsultationAppointmentLocal,
  formatPreferredSlotAccra,
} from "../lib/formatConsultationAppointment";
import EmailLayout from "./EmailLayout";
import {
  emailColors,
  emailDetailBox,
  emailFonts,
  emailParagraph,
} from "./emailStyles";

export type BespokeBookingEmailStatus =
  | "pending"
  | "reschedule_proposed"
  | "confirmed"
  | "cancelled"
  | "declined";

export type BespokeBookingAdminEvent =
  | "new_booking"
  | "reschedule_accepted"
  | "counter_request";

export type BespokeBookingEmailProps = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  service: string;
  preferredDate: string;
  preferredTime?: string;
  scheduledAt?: string;
  proposedScheduledAt?: string;
  bookingCode: string;
  bookingReference?: string;
  paymentStatus?: string;
  amountGhs?: number;
  status: BespokeBookingEmailStatus;
  notes?: string;
  rescheduleNote?: string;
  customerRescheduleResponse?: string;
  cancellationReason?: string;
  refundReviewRequired?: boolean;
  acceptRescheduleUrl?: string;
  requestAnotherTimeUrl?: string;
  isAdmin?: boolean;
  adminEvent?: BespokeBookingAdminEvent;
  adminConsultationsUrl?: string;
};

const DEFAULT_ADMIN_CONSULTATIONS_URL =
  "https://admin.joeythebrand.com/content/consultations";

const labelStyle = {
  margin: "0 0 4px",
  fontFamily: emailFonts.sans,
  fontSize: "9px",
  letterSpacing: "2px",
  color: emailColors.soft,
  textTransform: "uppercase" as const,
};

const valueStyle = {
  ...emailParagraph,
  margin: "0 0 14px",
  color: emailColors.headline,
};

export default function BespokeBookingEmail({
  customerName = "Jane Doe",
  customerEmail = "jane@example.com",
  customerPhone = "+123456789",
  service = "Full Bespoke Suit",
  preferredDate = "2026-09-01",
  preferredTime = "",
  scheduledAt = "",
  proposedScheduledAt = "",
  bookingCode = "BSP-8B41X",
  bookingReference = "",
  paymentStatus = "paid",
  amountGhs,
  status = "pending",
  notes = "",
  rescheduleNote = "",
  customerRescheduleResponse = "",
  cancellationReason = "",
  refundReviewRequired = false,
  acceptRescheduleUrl = "",
  requestAnotherTimeUrl = "",
  isAdmin = false,
  adminEvent = "new_booking",
  adminConsultationsUrl = DEFAULT_ADMIN_CONSULTATIONS_URL,
}: BespokeBookingEmailProps) {
  const firstName = customerName.split(" ")[0] || "Customer";
  const baseUrl = getEmailBaseUrl();

  const isPending = status === "pending";
  const isRescheduleProposed = status === "reschedule_proposed";
  const isConfirmed = status === "confirmed";
  const isCancelled = status === "cancelled" || status === "declined";

  const displayCode = isConfirmed
    ? bookingCode
    : isCancelled
      ? "Cancelled"
      : isRescheduleProposed
        ? "Pending Agreement"
        : "Pending Review";

  const displayStatus = isConfirmed
    ? "Confirmed"
    : isRescheduleProposed
      ? "Reschedule Proposed"
      : isCancelled
        ? "Cancelled"
        : "Paid & Pending Review";

  const displayPaymentStatus =
    paymentStatus === "paid"
      ? amountGhs
        ? `Paid (Verified — GHS ${Number(amountGhs).toLocaleString()})`
        : "Paid (Verified)"
      : paymentStatus || "Pending";

  const formattedPreferredSlot = formatPreferredSlotAccra(preferredDate, preferredTime);
  const formattedScheduled = scheduledAt ? formatConsultationAppointmentLocal(scheduledAt) : "";
  const formattedProposed = proposedScheduledAt
    ? formatConsultationAppointmentLocal(proposedScheduledAt)
    : "";

  let preview = "Your Bespoke Consultation Request is Pending";
  let title = "A conversation starts here.";
  let eyebrow = "MADE FOR YOU";
  let leadCopy = "";

  if (isAdmin) {
    eyebrow = "STUDIO CONSULTATION";
    if (adminEvent === "reschedule_accepted") {
      preview = `Reschedule Accepted — ${customerName} (${bookingCode})`;
      title = "Reschedule accepted.";
      leadCopy = `${customerName} accepted the proposed reschedule for their ${service} consultation. The appointment is now confirmed.`;
    } else if (adminEvent === "counter_request") {
      preview = `Another Time Requested — ${customerName} (${service})`;
      title = "Another time requested.";
      leadCopy = `${customerName} responded to your reschedule proposal and requested a different time. Review their message below.`;
    } else {
      preview = `New Bespoke Request from ${customerName} — ${service}`;
      title = "A new consultation request.";
      leadCopy =
        "A customer has paid for a consultation and chosen a day. Open the studio to confirm or reschedule.";
    }
  } else if (isRescheduleProposed) {
    preview = `New Proposed Time for Your Bespoke Consultation — JOEY The brand`;
    title = "Your appointment has a new day.";
    eyebrow = "YOUR APPOINTMENT";
    leadCopy = `Hello ${firstName}, we reviewed your request and would like to propose a new date and time. Please accept the proposed slot or request another time.`;
  } else if (isCancelled) {
    preview = `Bespoke Consultation Cancelled — JOEY The brand`;
    title = "Appointment cancelled.";
    eyebrow = "YOUR APPOINTMENT";
    leadCopy = `Hello ${firstName}, your bespoke consultation request for ${service} has been cancelled.`;
  } else if (isPending) {
    preview = "Your Bespoke Consultation Request is Pending";
    title = "A conversation starts here.";
    eyebrow = "MADE FOR YOU";
    leadCopy = `Hello ${firstName}, your payment is confirmed. The day you asked for is with the studio. This is not yet a confirmed appointment — we will email you when it is confirmed or if it needs to move.`;
  } else {
    preview = `Your Bespoke Consultation is Confirmed — ${bookingCode}`;
    title = "Your day is confirmed.";
    eyebrow = "YOUR APPOINTMENT";
    leadCopy = `Hello ${firstName}, great news — your bespoke session is confirmed. This email is your appointment slip.`;
  }

  const ctaHref = isAdmin
    ? adminConsultationsUrl || DEFAULT_ADMIN_CONSULTATIONS_URL
    : isRescheduleProposed && acceptRescheduleUrl
      ? acceptRescheduleUrl
      : `${baseUrl}/account`;
  const ctaLabel = isAdmin
    ? "OPEN THE STUDIO"
    : isRescheduleProposed && acceptRescheduleUrl
      ? "ACCEPT NEW DATE"
      : "VIEW YOUR ACCOUNT";

  return (
    <EmailLayout
      preview={preview}
      eyebrow={eyebrow}
      title={title}
      ctaHref={ctaHref}
      ctaLabel={ctaLabel}
      helpText={
        isAdmin
          ? "A note from your Joey studio."
          : "Questions? Reply to this email. We’re here to help."
      }
      secondaryHref={
        !isAdmin && isRescheduleProposed && requestAnotherTimeUrl
          ? requestAnotherTimeUrl
          : undefined
      }
      secondaryLabel={
        !isAdmin && isRescheduleProposed && requestAnotherTimeUrl
          ? "Request another time"
          : undefined
      }
    >
      <div style={{ textAlign: "center" }}>
        <Text style={emailParagraph}>{leadCopy}</Text>
        <Text
          style={{
            margin: "20px 0 4px",
            fontFamily: emailFonts.sans,
            fontSize: "10px",
            letterSpacing: "1.5px",
            color: emailColors.meta,
          }}
        >
          {displayCode}
        </Text>
      </div>

      {isRescheduleProposed && formattedProposed ? (
        <div style={emailDetailBox}>
          <Text style={labelStyle}>Proposed date &amp; time (Africa/Accra)</Text>
          <Text style={{ ...valueStyle, fontFamily: emailFonts.serif, fontSize: "18px" }}>
            {formattedProposed}
          </Text>
          {rescheduleNote ? (
            <Text style={emailParagraph}>
              <strong>Note from JOEY:</strong> {rescheduleNote}
            </Text>
          ) : null}
        </div>
      ) : null}

      {isAdmin && customerRescheduleResponse ? (
        <div style={emailDetailBox}>
          <Text style={labelStyle}>Customer response</Text>
          <Text style={valueStyle}>{customerRescheduleResponse}</Text>
        </div>
      ) : null}

      {isCancelled && (cancellationReason || refundReviewRequired || paymentStatus === "paid") ? (
        <div style={emailDetailBox}>
          {cancellationReason ? (
            <Text style={emailParagraph}>
              <strong>Reason / note:</strong> {cancellationReason}
            </Text>
          ) : null}
          {refundReviewRequired || paymentStatus === "paid" ? (
            <Text style={emailParagraph}>
              <strong>Deposit &amp; payment review:</strong> Because a payment was recorded, your
              deposit has been flagged for manual review. We will follow up with you directly.
            </Text>
          ) : null}
        </div>
      ) : null}

      <div style={emailDetailBox}>
        <Text style={labelStyle}>Customer</Text>
        <Text style={valueStyle}>{customerName}</Text>
        <Text style={labelStyle}>Email</Text>
        <Text style={valueStyle}>{customerEmail}</Text>
        <Text style={labelStyle}>Phone / WhatsApp</Text>
        <Text style={valueStyle}>{customerPhone || "—"}</Text>
        <Text style={labelStyle}>Service</Text>
        <Text style={valueStyle}>{service}</Text>
        <Text style={labelStyle}>Preferred day</Text>
        <Text style={valueStyle}>{formattedPreferredSlot}</Text>
        {formattedScheduled ? (
          <>
            <Text style={labelStyle}>Confirmed slot</Text>
            <Text style={valueStyle}>{formattedScheduled}</Text>
          </>
        ) : null}
        {formattedProposed && !isConfirmed ? (
          <>
            <Text style={labelStyle}>Proposed slot</Text>
            <Text style={valueStyle}>{formattedProposed}</Text>
          </>
        ) : null}
        {bookingReference ? (
          <>
            <Text style={labelStyle}>Booking reference</Text>
            <Text style={valueStyle}>{bookingReference}</Text>
          </>
        ) : null}
        <Text style={labelStyle}>Payment</Text>
        <Text style={valueStyle}>{displayPaymentStatus}</Text>
        <Text style={labelStyle}>Status</Text>
        <Text style={{ ...valueStyle, marginBottom: 0 }}>{displayStatus}</Text>
        {(notes || isAdmin) && notes ? (
          <>
            <Text style={{ ...labelStyle, marginTop: "14px" }}>Notes</Text>
            <Text style={{ ...valueStyle, marginBottom: 0 }}>{notes}</Text>
          </>
        ) : null}
      </div>

      {!isAdmin && isRescheduleProposed && acceptRescheduleUrl && requestAnotherTimeUrl ? (
        <Text
          style={{
            ...emailParagraph,
            textAlign: "center",
            fontSize: "12px",
            color: emailColors.muted,
          }}
        >
          These secure response links are single-use and expire in 72 hours.
        </Text>
      ) : null}

      {!isAdmin && !isCancelled && !isRescheduleProposed ? (
        <Text
          style={{
            ...emailParagraph,
            textAlign: "center",
            fontSize: "12px",
            color: emailColors.muted,
          }}
        >
          Tip: print this email (Ctrl+P / Cmd+P) and bring it with you.
        </Text>
      ) : null}
    </EmailLayout>
  );
}
