import {
  Body,
  Column,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Text,
  Button,
} from "@react-email/components";
import * as React from "react";

export type UrTailorBookingEmailProps = {
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

  return "https://urtailorstailor.com";
}

const main = {
  backgroundColor: "#f4f4f5",
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "28px 24px 32px",
  maxWidth: "560px",
};

const machineWrap = {
  border: "3px solid #272B36",
  borderRadius: "10px",
  overflow: "hidden" as const,
  backgroundColor: "#ffffff",
};

const headerBand = {
  backgroundColor: "#272B36",
  backgroundImage: "linear-gradient(135deg, #272B36 0%, #4a5568 100%)",
  padding: "18px 22px",
};

const logoMark = {
  margin: 0,
  fontFamily: '"Bodoni Moda", "Bodoni MT", Didot, "Libre Bodoni", Georgia, serif',
  fontSize: "15px",
  fontWeight: 500 as const,
  letterSpacing: "0.06em",
  lineHeight: 1.15,
  color: "#ffffff",
};

const topCopyCol = {
  borderLeft: "1px solid rgba(255, 255, 255, 0.22)",
  paddingLeft: "16px",
  marginLeft: "4px",
  verticalAlign: "middle" as const,
};

const brandLine = {
  margin: "0 0 8px",
  fontSize: "15.7px",
  fontWeight: 600 as const,
  letterSpacing: "0.06em",
  lineHeight: 1.35,
  color: "#ffffff",
};

const subLine = {
  margin: 0,
  fontSize: "11.5px",
  fontWeight: 400 as const,
  opacity: 0.88,
  letterSpacing: "0.04em",
  lineHeight: 1.45,
  color: "#ffffff",
  maxWidth: "340px",
};

const perforation = {
  height: "8px",
  backgroundImage:
    "repeating-linear-gradient(90deg, #272B36 0px, #272B36 5px, transparent 5px, transparent 10px)",
  opacity: 0.35,
  margin: 0,
  padding: 0,
  lineHeight: 0,
  fontSize: 0,
};

const card = {
  backgroundColor: "#ffffff",
  padding: "22px 22px 8px",
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
  borderBottom: "1px solid #e4e4e7",
};
const td = {
  padding: "12px 0",
  borderBottom: "1px solid #e4e4e7",
  fontSize: "15px",
  color: "#18181b",
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
  backgroundColor: "#272B36",
  color: "#ffffff",
  padding: "12px 24px",
  fontSize: "14px",
  fontWeight: 600 as const,
  textDecoration: "none",
  letterSpacing: "0.05em",
  borderRadius: "6px",
};

const printHint = {
  fontSize: "12px",
  color: "#a1a1aa",
  textAlign: "center" as const,
  marginTop: "16px",
  fontStyle: "italic",
};

export default function UrTailorBookingEmail({
  customerName = "Jane Doe",
  customerEmail = "jane@example.com",
  customerPhone = "+123456789",
  service = "Full Bespoke Suit",
  preferredDate = "2026-09-01",
  bookingCode = "BSP-8B41X",
  status = "pending",
  notes = "",
}: UrTailorBookingEmailProps) {
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
              .machineWrap { border-width: 2px !important; }
            }
          `}
        </style>
      </Head>
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={machineWrap} className="machineWrap">
            <Section style={headerBand}>
              <Row>
                <Column style={{ width: "132px", verticalAlign: "middle", paddingRight: "16px" }}>
                  <Text style={logoMark}>URTAILORSTAILOR</Text>
                </Column>
                <Column style={topCopyCol}>
                  <Text style={brandLine}>Appointment {isPending ? "Request" : "Confirmation"}</Text>
                  <Text style={subLine}>
                    {isPending 
                      ? "Your downpayment is received. We will review and confirm shortly." 
                      : "Print or save this slip and bring it with you."}
                  </Text>
                </Column>
              </Row>
            </Section>
            <Section style={perforation}>&nbsp;</Section>
            
            <Section style={card}>
              <Text style={{ textAlign: "center", fontSize: "15px", color: "#27272a", marginBottom: "24px", lineHeight: "1.6" }}>
                {isPending ? (
                  <>Thank you for booking a bespoke session with URTAILORSTAILOR, {customerName.split(" ")[0]}. Your request is currently pending review.</>
                ) : (
                  <>Great news, {customerName.split(" ")[0]}! Your bespoke session has been confirmed. This email serves as your official appointment slip.</>
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

              <Section style={btnContainer} className="no-print">
                <Button href={`${baseUrl}/account`} style={button}>
                  View in Account Dashboard
                </Button>
                <Text style={printHint}>
                  Tip: You can print this email directly (Ctrl+P / Cmd+P) and bring it with you.
                </Text>
              </Section>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
