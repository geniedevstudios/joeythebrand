import {
  Body,
  Column,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
  Button,
} from "@react-email/components";
import * as React from "react";

export type BespokeBookingEmailProps = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  service: string;
  preferredDate: string;
  bookingCode: string;
  status: "pending" | "confirmed";
  notes?: string;
};

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

const printHint = {
  fontSize: "12px",
  color: "#888888",
  textAlign: "center" as const,
  marginTop: "16px",
  fontStyle: "italic",
};

export default function BespokeBookingEmail({
  customerName = "Jane Doe",
  customerEmail = "jane@example.com",
  customerPhone = "+123456789",
  service = "Full Bespoke Suit",
  preferredDate = "2026-09-01",
  bookingCode = "BSP-8B41X",
  status = "pending",
  notes = "",
}: BespokeBookingEmailProps) {
  const isPending = status === "pending";
  const displayCode = isPending ? "Pending Review" : bookingCode;
  const displayStatus = isPending ? "Paid & Pending Review" : "Confirmed";
  const preview = isPending 
    ? "Your Bespoke Consultation Request is Pending" 
    : `Your Bespoke Consultation is Confirmed — ${bookingCode}`;
  const baseUrl = getBaseUrl();

  const formattedDate = preferredDate && preferredDate !== "—" 
    ? new Date(preferredDate.length === 10 ? `${preferredDate}T12:00:00` : preferredDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : "—";

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
        <div style={{ 
          backgroundColor: "#000000", 
          backgroundImage: `url(${baseUrl}/collection_kpq24u.jpg)`, 
          backgroundSize: "cover", 
          backgroundPosition: "center",
          padding: "60px 0 120px 0", 
          textAlign: "center" 
        }} className="no-print">
          <Img 
            src={`${baseUrl}/white%20logo.png`} 
            alt="JOEY The brand" 
            style={{ height: "40px", width: "auto", margin: "0 auto", display: "block" }} 
          />
        </div>

        <Container style={{ ...container, marginTop: "-80px" }}>
          <Section style={card}>
            {/* Header */}
            <Text style={headerSerif}>Appointment {isPending ? "Request" : "Confirmation"}</Text>
            <Text style={subHeadingText}>Order No. {displayCode}</Text>
            
            <Text style={{ textAlign: "center", fontSize: "15px", color: "#444444", marginBottom: "32px", lineHeight: "1.5" }}>
              {isPending ? (
                <>Thank you for booking a bespoke session with JOEY The brand, {customerName.split(" ")[0]}. Your downpayment has been received. We will review your request and send a confirmation shortly with your booking code.</>
              ) : (
                <>Great news, {customerName.split(" ")[0]}! Your bespoke session has been confirmed. This email serves as your printable appointment slip.</>
              )}
            </Text>

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
                  <th style={th}>Preferred Date</th>
                  <td style={td}>{formattedDate}</td>
                </tr>
                <tr>
                  <th style={th}>Booking Code</th>
                  <td style={isPending ? td : tdMono}>{displayCode}</td>
                </tr>
                <tr>
                  <th style={th}>Status</th>
                  <td style={td}>{displayStatus}</td>
                </tr>
                {notes && (
                  <tr>
                    <th style={{ ...th, borderBottom: "none" }}>Customer Notes</th>
                    <td style={{ ...td, borderBottom: "none" }}>{notes}</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div style={divider}></div>

            <Section style={btnContainer} className="no-print">
              <Button href={`${baseUrl}/account`} style={button}>
                View in Account Dashboard
              </Button>
              <Text style={printHint}>
                Tip: You can print this email directly (Ctrl+P / Cmd+P) and bring it with you.
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
