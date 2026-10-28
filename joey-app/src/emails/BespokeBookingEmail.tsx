import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Button,
} from "@react-email/components";
import * as React from "react";
import {
  formatConsultationAppointmentLocal,
  formatPreferredSlotAccra,
} from "../lib/formatConsultationAppointment";

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

function getBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;

  return "https://joeythebrand.com";
}

const main = {
  backgroundColor: "#f9f9f9",
  fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "40px 0",
  width: "600px",
  maxWidth: "100%",
};

const card = {
  backgroundColor: "#ffffff",
  padding: "40px 48px",
  boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
  border: "1px solid #eeeeee",
  borderRadius: "8px",
};

const headerSerif = {
  fontFamily: '"Bodoni Moda", "Times New Roman", Times, serif',
  fontSize: "32px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "0 0 8px 0",
  color: "#111111",
};

const subHeadingText = {
  fontSize: "14px",
  color: "#888888",
  textAlign: "center" as const,
  margin: "0 0 40px 0",
  letterSpacing: "0.5px",
};

const divider = {
  borderTop: "1px dashed #dddddd",
  margin: "32px 0",
};

const table = { width: "100%", borderCollapse: "collapse" as const };
const th = {
  textAlign: "left" as const,
  verticalAlign: "top" as const,
  width: "40%",
  padding: "12px 10px 12px 0",
  fontSize: "12px",
  fontWeight: "bold",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
  color: "#666666",
  borderBottom: "1px solid #eeeeee",
};
const td = {
  padding: "12px 0",
  borderBottom: "1px solid #eeeeee",
  fontSize: "14px",
  color: "#333333",
};
const tdMono = {
  ...td,
  fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
  fontWeight: "bold",
  letterSpacing: "0.05em",
};

const btnContainer = {
  textAlign: "center" as const,
  marginTop: "40px",
};

const button = {
  backgroundColor: "#333333",
  color: "#ffffff",
  padding: "14px 28px",
  fontSize: "14px",
  fontWeight: "bold",
  textDecoration: "none",
  letterSpacing: "1px",
  borderRadius: "4px",
};

const secondaryButton = {
  backgroundColor: "#ffffff",
  color: "#333333",
  border: "1px solid #333333",
  padding: "13px 24px",
  fontSize: "14px",
  fontWeight: "bold",
  textDecoration: "none",
  letterSpacing: "1px",
  borderRadius: "4px",
};

const printHint = {
  fontSize: "12px",
  color: "#888888",
  textAlign: "center" as const,
  marginTop: "16px",
  fontStyle: "italic",
};

const calloutBox = {
  backgroundColor: "#f7f7f7",
  border: "1px solid #e5e5e5",
  borderRadius: "6px",
  padding: "18px 20px",
  marginBottom: "28px",
  fontSize: "14px",
  color: "#222222",
  lineHeight: "1.6",
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
  const baseUrl = getBaseUrl();

  const isPending = status === "pending";
  const isRescheduleProposed = status === "reschedule_proposed";
  const isConfirmed = status === "confirmed";
  const isCancelled = status === "cancelled" || status === "declined";

  const displayCode = isConfirmed ? bookingCode : isCancelled ? "Cancelled" : isRescheduleProposed ? "Pending Agreement" : "Pending Review";

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
  let headline = `Appointment ${isPending ? "Request" : "Confirmation"}`;
  let subHeading = `Order No. ${displayCode}`;
  let leadCopy: React.ReactNode = null;

  if (isAdmin) {
    if (adminEvent === "reschedule_accepted") {
      preview = `Reschedule Accepted — ${customerName} (${bookingCode})`;
      headline = "Reschedule Accepted";
      subHeading = `Booking Code: ${bookingCode}`;
      leadCopy = (
        <>
          <strong>{customerName}</strong> has accepted the proposed reschedule date and time for their{" "}
          <strong>{service}</strong> consultation. The appointment is now confirmed.
        </>
      );
    } else if (adminEvent === "counter_request") {
      preview = `Another Time Requested — ${customerName} (${service})`;
      headline = "Another Time Requested";
      subHeading = `Ref: ${bookingReference || "Pending Review"}`;
      leadCopy = (
        <>
          <strong>{customerName}</strong> responded to your reschedule proposal and requested a different time. Review their message below and confirm or propose a new slot in the admin panel.
        </>
      );
    } else {
      preview = `New Bespoke Request from ${customerName} — ${service}`;
      headline = `New Bespoke Request`;
      subHeading = bookingReference ? `Ref: ${bookingReference}` : "Paid & Pending Review";
      leadCopy = (
        <>
          A customer just paid the downpayment and booked a bespoke consultation slot. Open the admin dashboard to confirm or reschedule this request.
        </>
      );
    }
  } else if (isRescheduleProposed) {
    preview = `New Proposed Time for Your Bespoke Consultation — JOEY The brand`;
    headline = "Reschedule Proposal";
    subHeading = "Action Required";
    leadCopy = (
      <>
        Hello {firstName}, we reviewed your bespoke consultation request and would like to propose a new date and time for your session. Please use the buttons below to accept the proposed slot or request another time.
      </>
    );
  } else if (isCancelled) {
    preview = `Bespoke Consultation Cancelled — JOEY The brand`;
    headline = "Appointment Cancelled";
    subHeading = bookingReference ? `Ref: ${bookingReference}` : "Consultation Update";
    leadCopy = (
      <>
        Hello {firstName}, your bespoke consultation request for <strong>{service}</strong> has been cancelled.
      </>
    );
  } else if (isPending) {
    preview = "Your Bespoke Consultation Request is Pending";
    headline = "Appointment Request";
    subHeading = `Order No. ${displayCode}`;
    leadCopy = (
      <>
        Thank you for booking a bespoke session with JOEY The brand, {firstName}. Your downpayment has been received. We will review your request and send a confirmation shortly with your booking code.
      </>
    );
  } else {
    preview = `Your Bespoke Consultation is Confirmed — ${bookingCode}`;
    headline = "Appointment Confirmation";
    subHeading = `Order No. ${displayCode}`;
    leadCopy = (
      <>
        Great news, {firstName}! Your bespoke session has been confirmed. This email serves as your printable appointment slip.
      </>
    );
  }

  return (
    <Html lang="en">
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,500;0,600;0,700&display=swap"
          rel="stylesheet"
        />
        <style>
          {`
            @media print {
              body { background: #fff !important; }
              .no-print { display: none !important; }
            }
          `}
        </style>
      </Head>
      <Preview>{preview}</Preview>
      <Body style={main}>
        {/* Outer Dark Header Wrapper */}
        <div
          style={{
            backgroundColor: "#000000",
            backgroundImage: `url(${baseUrl}/collection_kpq24u.jpg)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            height: "380px",
            width: "100%",
            paddingTop: "60px",
            textAlign: "center",
          }}
          className="no-print"
        >
          <Img
            src={`${baseUrl}/white%20logo.png`}
            alt="JOEY The brand"
            style={{ width: "280px", height: "auto", margin: "0 auto", display: "block" }}
          />
        </div>

        {/* Main Card Wrapper */}
        <div style={{ marginTop: "-160px", width: "100%" }}>
          <Container style={container}>
            <Section style={card}>
              <Text style={headerSerif}>{headline}</Text>
              <Text style={subHeadingText}>{subHeading}</Text>

              <Text
                style={{
                  textAlign: "center",
                  fontSize: "15px",
                  color: "#444444",
                  marginBottom: "32px",
                  lineHeight: "1.5",
                }}
              >
                {leadCopy}
              </Text>

              {isRescheduleProposed && formattedProposed ? (
                <div style={calloutBox}>
                  <div style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "11px", letterSpacing: "1px", color: "#555555", marginBottom: "6px" }}>
                    Proposed Date &amp; Time (Africa/Accra)
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "bold", color: "#111111" }}>
                    {formattedProposed}
                  </div>
                  {rescheduleNote ? (
                    <div style={{ marginTop: "10px", fontSize: "14px", color: "#444444" }}>
                      <strong>Note from JOEY:</strong> {rescheduleNote}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {isAdmin && customerRescheduleResponse ? (
                <div style={calloutBox}>
                  <div style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "11px", letterSpacing: "1px", color: "#555555", marginBottom: "6px" }}>
                    Customer Response
                  </div>
                  <div style={{ fontSize: "14px", color: "#111111" }}>
                    {customerRescheduleResponse}
                  </div>
                </div>
              ) : null}

              {isCancelled && (cancellationReason || refundReviewRequired || paymentStatus === "paid") ? (
                <div style={calloutBox}>
                  {cancellationReason ? (
                    <div style={{ marginBottom: refundReviewRequired || paymentStatus === "paid" ? "10px" : "0" }}>
                      <strong>Reason / Note:</strong> {cancellationReason}
                    </div>
                  ) : null}
                  {refundReviewRequired || paymentStatus === "paid" ? (
                    <div style={{ fontSize: "13px", color: "#444444" }}>
                      <strong>Deposit &amp; Payment Review:</strong> Because a payment was recorded for this booking, your deposit has been flagged for manual review by our team in accordance with our business policy. We will follow up with you directly.
                    </div>
                  ) : null}
                </div>
              ) : null}

              <table style={table}>
                <tbody>
                  <tr>
                    <th style={th}>Customer Name</th>
                    <td style={td}>{customerName}</td>
                  </tr>
                  <tr>
                    <th style={th}>Email</th>
                    <td style={td}>{customerEmail}</td>
                  </tr>
                  <tr>
                    <th style={th}>Phone / WhatsApp</th>
                    <td style={td}>{customerPhone || "—"}</td>
                  </tr>
                  <tr>
                    <th style={th}>Service</th>
                    <td style={td}>{service}</td>
                  </tr>
                  <tr>
                    <th style={th}>Preferred Date / Time</th>
                    <td style={td}>{formattedPreferredSlot}</td>
                  </tr>
                  {formattedScheduled ? (
                    <tr>
                      <th style={th}>Confirmed Slot</th>
                      <td style={td}>{formattedScheduled}</td>
                    </tr>
                  ) : null}
                  {formattedProposed && !isConfirmed ? (
                    <tr>
                      <th style={th}>Proposed Slot</th>
                      <td style={td}>{formattedProposed}</td>
                    </tr>
                  ) : null}
                  {bookingReference ? (
                    <tr>
                      <th style={th}>Booking Reference</th>
                      <td style={tdMono}>{bookingReference}</td>
                    </tr>
                  ) : null}
                  <tr>
                    <th style={th}>Payment Status</th>
                    <td style={td}>{displayPaymentStatus}</td>
                  </tr>
                  <tr>
                    <th style={th}>Booking Code</th>
                    <td style={isConfirmed ? tdMono : td}>{displayCode}</td>
                  </tr>
                  <tr>
                    <th style={th}>Status</th>
                    <td style={td}>{displayStatus}</td>
                  </tr>
                  {(notes || isAdmin) && (
                    <tr>
                      <th style={{ ...th, borderBottom: "none" }}>Customer Notes</th>
                      <td style={{ ...td, borderBottom: "none" }}>{notes || "—"}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div style={divider}></div>

              <Section style={btnContainer} className="no-print">
                {isAdmin ? (
                  <Button href={adminConsultationsUrl || DEFAULT_ADMIN_CONSULTATIONS_URL} style={button}>
                    Manage Consultations in Admin
                  </Button>
                ) : isRescheduleProposed && (acceptRescheduleUrl || requestAnotherTimeUrl) ? (
                  <div>
                    {acceptRescheduleUrl ? (
                      <div style={{ marginBottom: "14px" }}>
                        <Button href={acceptRescheduleUrl} style={button}>
                          Accept New Date
                        </Button>
                      </div>
                    ) : null}
                    {requestAnotherTimeUrl ? (
                      <div>
                        <Button href={requestAnotherTimeUrl} style={secondaryButton}>
                          Request Another Time
                        </Button>
                      </div>
                    ) : null}
                    <Text style={printHint}>
                      These secure response links are single-use and expire in 72 hours.
                    </Text>
                  </div>
                ) : (
                  <>
                    <Button href={`${baseUrl}/account`} style={button}>
                      View in Account Dashboard
                    </Button>
                    {!isCancelled && (
                      <Text style={printHint}>
                        Tip: You can print this email directly (Ctrl+P / Cmd+P) and bring it with you.
                      </Text>
                    )}
                  </>
                )}
              </Section>
            </Section>
          </Container>
        </div>
      </Body>
    </Html>
  );
}
