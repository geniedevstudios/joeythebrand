import {
  Body,
  Container,
  Head,
  Html,
  Link,
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

export type UrTailorBookingEmailStatus =
  | "pending"
  | "reschedule_proposed"
  | "confirmed"
  | "cancelled"
  | "declined";

export type UrTailorBookingAdminEvent =
  | "new_booking"
  | "reschedule_accepted"
  | "counter_request";

export type UrTailorBookingEmailProps = {
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
  status: UrTailorBookingEmailStatus;
  notes?: string;
  rescheduleNote?: string;
  customerRescheduleResponse?: string;
  cancellationReason?: string;
  refundReviewRequired?: boolean;
  acceptRescheduleUrl?: string;
  requestAnotherTimeUrl?: string;
  slipUrl?: string;
  isAdmin?: boolean;
  adminEvent?: UrTailorBookingAdminEvent;
  adminConsultationsUrl?: string;
};

const DEFAULT_ADMIN_CONSULTATIONS_URL =
  "https://admin.joeythebrand.com/content/consultations";

function getBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;

  return "https://urtailorstailor.com";
}

const main = {
  backgroundColor: "#000000",
  fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "40px 0",
  width: "600px",
  maxWidth: "100%",
};

const card = {
  backgroundColor: "#111111",
  padding: "40px 48px",
  border: "1px solid #333333",
};

const headerSerif = {
  fontFamily: '"Bodoni Moda", "Times New Roman", Times, serif',
  fontSize: "36px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "0 0 8px 0",
  color: "#ffffff",
};

const subHeaderText = {
  fontSize: "13px",
  color: "#a1a1aa",
  textAlign: "center" as const,
  margin: "0 0 40px 0",
  letterSpacing: "0.5px",
};

const table = { width: "100%", borderCollapse: "collapse" as const, marginTop: "16px" };
const th = {
  textAlign: "left" as const,
  verticalAlign: "top" as const,
  width: "36%",
  padding: "12px 10px 12px 0",
  fontSize: "11px",
  fontWeight: 700 as const,
  textTransform: "uppercase" as const,
  letterSpacing: "0.07em",
  color: "#71717a",
  borderBottom: "1px solid #333333",
};
const td = {
  padding: "12px 0",
  borderBottom: "1px solid #333333",
  fontSize: "15px",
  color: "#ffffff",
};
const tdMono = {
  ...td,
  fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
  fontWeight: "bold",
  letterSpacing: "0.05em",
};

const btnContainer = {
  textAlign: "center" as const,
  marginTop: "32px",
  marginBottom: "16px",
};

const button = {
  backgroundColor: "#ffffff",
  color: "#000000",
  padding: "12px 24px",
  fontSize: "13px",
  fontWeight: "bold",
  textDecoration: "none",
  letterSpacing: "1px",
  borderRadius: "0px",
};

const secondaryButton = {
  backgroundColor: "#111111",
  color: "#ffffff",
  border: "1px solid #ffffff",
  padding: "11px 22px",
  fontSize: "13px",
  fontWeight: "bold",
  textDecoration: "none",
  letterSpacing: "1px",
  borderRadius: "0px",
};

const printHint = {
  fontSize: "12px",
  color: "#a1a1aa",
  textAlign: "center" as const,
  marginTop: "16px",
  fontStyle: "italic",
};

const calloutBox = {
  backgroundColor: "#18181b",
  border: "1px solid #3f3f46",
  padding: "18px 20px",
  marginBottom: "24px",
  fontSize: "14px",
  color: "#f4f4f5",
  lineHeight: "1.6",
};

const footerWrap = {
  backgroundColor: "#000000",
  padding: "32px 48px",
  textAlign: "center" as const,
};

const footerLinks = {
  fontSize: "11px",
  fontWeight: "bold",
  color: "#ffffff",
  margin: "0 0 16px 0",
};

const footerAddress = {
  fontSize: "11px",
  color: "#a1a1aa",
  margin: "0",
  lineHeight: "1.6",
};

export default function UrTailorBookingEmail({
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
  slipUrl = "",
  isAdmin = false,
  adminEvent = "new_booking",
  adminConsultationsUrl = DEFAULT_ADMIN_CONSULTATIONS_URL,
}: UrTailorBookingEmailProps) {
  const firstName = customerName.split(" ")[0] || "Customer";
  const baseUrl = getBaseUrl();
  const joeyUrl = "https://joeythebrand.com";

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
  let headline = `Appointment ${isPending ? "Request" : "Confirmed"}`;
  let subHeading = isPending
    ? "We will review and confirm shortly."
    : "Print or save this slip and bring it with you.";
  let leadCopy: React.ReactNode = null;

  if (isAdmin) {
    if (adminEvent === "reschedule_accepted") {
      preview = `Reschedule Accepted — ${customerName} (${bookingCode})`;
      headline = "Reschedule Accepted";
      subHeading = `Booking Code: ${bookingCode}`;
      leadCopy = (
        <>
          <strong>{customerName}</strong> accepted the proposed reschedule time for their{" "}
          <strong>{service}</strong> session. The appointment is now confirmed.
        </>
      );
    } else if (adminEvent === "counter_request") {
      preview = `Another Time Requested — ${customerName} (${service})`;
      headline = "Another Time Requested";
      subHeading = `Ref: ${bookingReference || "Pending Review"}`;
      leadCopy = (
        <>
          <strong>{customerName}</strong> responded to your reschedule proposal and requested another time. Review their response below in the admin dashboard.
        </>
      );
    } else {
      preview = `New Portfolio Consultation from ${customerName} — ${service}`;
      headline = "New Consultation Request";
      subHeading = bookingReference ? `Ref: ${bookingReference}` : "Paid & Pending Review";
      leadCopy = (
        <>
          A client just paid and submitted a portfolio consultation request on URTAILORSTAILOR. Open the admin dashboard to confirm or reschedule this request.
        </>
      );
    }
  } else if (isRescheduleProposed) {
    preview = "New Proposed Time for Your Consultation — URTAILORSTAILOR";
    headline = "Reschedule Proposal";
    subHeading = "Action Required — Please review your proposed time.";
    leadCopy = (
      <>
        Hello {firstName}, we reviewed your session request with URTAILORSTAILOR and would like to propose a new date and time. Use the buttons below to accept the new time or request another slot.
      </>
    );
  } else if (isCancelled) {
    preview = "Consultation Cancelled — URTAILORSTAILOR";
    headline = "Appointment Cancelled";
    subHeading = bookingReference ? `Ref: ${bookingReference}` : "Consultation Update";
    leadCopy = (
      <>
        Hello {firstName}, your consultation booking for <strong>{service}</strong> with URTAILORSTAILOR has been cancelled.
      </>
    );
  } else if (isPending) {
    preview = "Your Bespoke Consultation Request is Pending";
    headline = "Appointment Request";
    subHeading = "We will review and confirm shortly.";
    leadCopy = (
      <>
        Thank you for booking a bespoke session with URTAILORSTAILOR, {firstName}. Your request is currently pending review.
      </>
    );
  } else {
    preview = `Your Bespoke Consultation is Confirmed — ${bookingCode}`;
    headline = "Appointment Confirmed";
    subHeading = "Print or save this slip and bring it with you.";
    leadCopy = (
      <>
        Great news, {firstName}! Your bespoke session has been confirmed. This email serves as your official appointment slip.
      </>
    );
  }

  const customerCtaHref = slipUrl || `${baseUrl}/account`;

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
              .dark-card { background: #fff !important; color: #000 !important; border-color: #ddd !important; }
              .dark-text { color: #000 !important; }
              .dark-border { border-color: #ddd !important; }
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
            backgroundImage: `url(${joeyUrl}/collection_kpq24u.jpg)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            height: "380px",
            width: "100%",
            paddingTop: "60px",
            textAlign: "center",
          }}
          className="no-print"
        >
          <Text
            style={{
              fontFamily: '"Bodoni Moda", serif',
              fontSize: "24px",
              color: "#ffffff",
              margin: 0,
              letterSpacing: "2px",
            }}
          >
            URTAILORSTAILOR
          </Text>
        </div>

        {/* Main Card Wrapper */}
        <div style={{ marginTop: "-160px", width: "100%" }}>
          <Container style={container}>
            <Section style={card} className="dark-card">
              <Text style={headerSerif} className="dark-text">
                {headline}
              </Text>
              <Text style={subHeaderText} className="dark-text">
                {subHeading}
              </Text>

              <Text
                style={{
                  textAlign: "center",
                  fontSize: "15px",
                  color: "#e4e4e7",
                  marginBottom: "24px",
                  lineHeight: "1.6",
                }}
                className="dark-text"
              >
                {leadCopy}
              </Text>

              {isRescheduleProposed && formattedProposed ? (
                <div style={calloutBox} className="dark-card dark-text">
                  <div style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "11px", letterSpacing: "1px", color: "#a1a1aa", marginBottom: "6px" }}>
                    Proposed Date &amp; Time (Africa/Accra)
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "bold", color: "#ffffff" }} className="dark-text">
                    {formattedProposed}
                  </div>
                  {rescheduleNote ? (
                    <div style={{ marginTop: "10px", fontSize: "14px", color: "#d4d4d8" }} className="dark-text">
                      <strong>Note from Joey:</strong> {rescheduleNote}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {isAdmin && customerRescheduleResponse ? (
                <div style={calloutBox} className="dark-card dark-text">
                  <div style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "11px", letterSpacing: "1px", color: "#a1a1aa", marginBottom: "6px" }}>
                    Customer Response
                  </div>
                  <div style={{ fontSize: "14px", color: "#ffffff" }} className="dark-text">
                    {customerRescheduleResponse}
                  </div>
                </div>
              ) : null}

              {isCancelled && (cancellationReason || refundReviewRequired || paymentStatus === "paid") ? (
                <div style={calloutBox} className="dark-card dark-text">
                  {cancellationReason ? (
                    <div style={{ marginBottom: refundReviewRequired || paymentStatus === "paid" ? "10px" : "0" }}>
                      <strong>Reason / Note:</strong> {cancellationReason}
                    </div>
                  ) : null}
                  {refundReviewRequired || paymentStatus === "paid" ? (
                    <div style={{ fontSize: "13px", color: "#d4d4d8" }} className="dark-text">
                      <strong>Deposit &amp; Payment Review:</strong> Because a payment was recorded for this booking, your deposit has been flagged for manual review by our team in accordance with our business policy. We will follow up with you directly.
                    </div>
                  ) : null}
                </div>
              ) : null}

              <table style={table}>
                <tbody>
                  <tr>
                    <th style={th} className="dark-border dark-text">Customer Name</th>
                    <td style={td} className="dark-border dark-text">{customerName}</td>
                  </tr>
                  <tr>
                    <th style={th} className="dark-border dark-text">Email</th>
                    <td style={td} className="dark-border dark-text">{customerEmail}</td>
                  </tr>
                  <tr>
                    <th style={th} className="dark-border dark-text">Phone / WhatsApp</th>
                    <td style={td} className="dark-border dark-text">{customerPhone || "—"}</td>
                  </tr>
                  <tr>
                    <th style={th} className="dark-border dark-text">Service</th>
                    <td style={td} className="dark-border dark-text">{service}</td>
                  </tr>
                  <tr>
                    <th style={th} className="dark-border dark-text">Preferred Date / Time</th>
                    <td style={td} className="dark-border dark-text">{formattedPreferredSlot}</td>
                  </tr>
                  {formattedScheduled ? (
                    <tr>
                      <th style={th} className="dark-border dark-text">Confirmed Slot</th>
                      <td style={td} className="dark-border dark-text">{formattedScheduled}</td>
                    </tr>
                  ) : null}
                  {formattedProposed && !isConfirmed ? (
                    <tr>
                      <th style={th} className="dark-border dark-text">Proposed Slot</th>
                      <td style={td} className="dark-border dark-text">{formattedProposed}</td>
                    </tr>
                  ) : null}
                  {bookingReference ? (
                    <tr>
                      <th style={th} className="dark-border dark-text">Booking Reference</th>
                      <td style={tdMono} className="dark-border dark-text">{bookingReference}</td>
                    </tr>
                  ) : null}
                  <tr>
                    <th style={th} className="dark-border dark-text">Payment Status</th>
                    <td style={td} className="dark-border dark-text">{displayPaymentStatus}</td>
                  </tr>
                  <tr>
                    <th style={th} className="dark-border dark-text">Booking Code</th>
                    <td style={isConfirmed ? tdMono : td} className="dark-border dark-text">{displayCode}</td>
                  </tr>
                  <tr>
                    <th style={th} className="dark-border dark-text">Status</th>
                    <td style={td} className="dark-border dark-text">{displayStatus}</td>
                  </tr>
                  {(notes || isAdmin) && (
                    <tr>
                      <th style={{ ...th, borderBottom: "none" }} className="dark-text">Customer Notes</th>
                      <td style={{ ...td, borderBottom: "none" }} className="dark-text">{notes || "—"}</td>
                    </tr>
                  )}
                </tbody>
              </table>

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
                    <Button href={customerCtaHref} style={button}>
                      View Booking Status
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

            {/* Footer */}
            <Section style={footerWrap} className="no-print">
              <Text style={footerLinks}>
                <Link href={`${baseUrl}`} style={{ color: "#ffffff", textDecoration: "none" }}>
                  URTAILORSTAILOR
                </Link>
              </Text>
              <Text style={footerAddress}>
                Sent from the URTAILORSTAILOR site.<br />
              </Text>
            </Section>
          </Container>
        </div>
      </Body>
    </Html>
  );
}
