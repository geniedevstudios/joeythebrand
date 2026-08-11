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
  borderRadius: "0px", // blocky for darko
};

const printHint = {
  fontSize: "12px",
  color: "#a1a1aa",
  textAlign: "center" as const,
  marginTop: "16px",
  fontStyle: "italic",
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
  const joeyUrl = "https://joeythebrand.com";

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
        <div style={{ 
          backgroundColor: "#000000", 
          backgroundImage: `url(${joeyUrl}/collection_kpq24u.jpg)`, 
          backgroundSize: "cover", 
          backgroundPosition: "center",
          height: "380px",
          width: "100%",
          paddingTop: "60px", 
          textAlign: "center" 
        }} className="no-print">
          <Text style={{ fontFamily: '"Bodoni Moda", serif', fontSize: "24px", color: "#ffffff", margin: 0, letterSpacing: "2px" }}>
            URTAILORSTAILOR
          </Text>
        </div>

        {/* Main Card Wrapper */}
        <div style={{ marginTop: "-160px", width: "100%" }}>
          <Container style={container}>
            <Section style={card} className="dark-card">
              
              <Text style={headerSerif} className="dark-text">
                Appointment {isPending ? "Request" : "Confirmed"}
              </Text>
              <Text style={subHeaderText} className="dark-text">
                {isPending 
                  ? "We will review and confirm shortly." 
                  : "Print or save this slip and bring it with you."}
              </Text>

              <Text style={{ textAlign: "center", fontSize: "15px", color: "#e4e4e7", marginBottom: "24px", lineHeight: "1.6" }} className="dark-text">
                {isPending ? (
                  <>Thank you for booking a bespoke session with URTAILORSTAILOR, {customerName.split(" ")[0]}. Your request is currently pending review.</>
                ) : (
                  <>Great news, {customerName.split(" ")[0]}! Your bespoke session has been confirmed. This email serves as your official appointment slip.</>
                )}
              </Text>

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
                    <th style={th} className="dark-border dark-text">Preferred Date</th>
                    <td style={td} className="dark-border dark-text">{formattedDate}</td>
                  </tr>
                  <tr>
                    <th style={th} className="dark-border dark-text">Booking Code</th>
                    <td style={isPending ? td : tdMono} className="dark-border dark-text">{displayCode}</td>
                  </tr>
                  <tr>
                    <th style={th} className="dark-border dark-text">Status</th>
                    <td style={td} className="dark-border dark-text">{displayStatus}</td>
                  </tr>
                  {notes && (
                    <tr>
                      <th style={{ ...th, borderBottom: "none" }} className="dark-text">Customer Notes</th>
                      <td style={{ ...td, borderBottom: "none" }} className="dark-text">{notes}</td>
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

            {/* Footer */}
            <Section style={footerWrap} className="no-print">
              <Text style={footerLinks}>
                <Link href={`${baseUrl}`} style={{ color: "#ffffff", textDecoration: "none" }}>URTAILORSTAILOR</Link>
              </Text>
              <Text style={footerAddress}>
                Sent from the URTAILORSTAILOR site.<br/>
              </Text>
            </Section>
          </Container>
        </div>
      </Body>
    </Html>
  );
}
