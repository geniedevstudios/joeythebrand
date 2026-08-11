import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

export type UrTailorContactMessageProps = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
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

const metaDataLabel = {
  fontSize: "12px",
  color: "#71717a",
  fontStyle: "italic",
  margin: "0 0 8px 0",
};

const metaDataValue = {
  fontSize: "14px",
  color: "#ffffff",
  margin: "0 0 24px 0",
  lineHeight: "1.5",
};

const link = {
  color: "#ffffff",
  textDecoration: "underline",
};

const messageShell = {
  backgroundColor: "#09090b",
  border: "1px solid #27272a",
  borderRadius: "6px",
  padding: "24px",
  marginTop: "8px",
};

const messageText = {
  color: "#ffffff",
  fontSize: "14px",
  lineHeight: 1.6,
  margin: 0,
  whiteSpace: "pre-wrap" as const,
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

export default function UrTailorContactMessage({
  name = "Jane Doe",
  email = "jane@example.com",
  phone = "+123456789",
  subject = "Personal Styling",
  message = "Hello! I would like to inquire about...",
}: UrTailorContactMessageProps) {
  const preview = `${subject} — ${name}`;
  const phoneDisplay = phone.trim();
  const telHref = phoneDisplay.replace(/[^\d+]/g, "");
  const baseUrl = getBaseUrl();
  const joeyUrl = "https://joeythebrand.com";

  return (
    <Html lang="en">
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,500;0,600;0,700&display=swap"
          rel="stylesheet"
        />
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
        }}>
          <Text style={{ fontFamily: '"Bodoni Moda", serif', fontSize: "24px", color: "#ffffff", margin: 0, letterSpacing: "2px" }}>
            URTAILORSTAILOR
          </Text>
        </div>

        {/* Main Card Wrapper (Negative margin pulls it up over the fixed-height header) */}
        <div style={{ marginTop: "-160px", width: "100%" }}>
          <Container style={container}>
            <Section style={card}>
            {/* Header */}
            <Text style={headerSerif}>New Inquiry</Text>
            <Text style={subHeaderText}>{subject}</Text>

            {/* Content */}
            <Text style={metaDataLabel}>From</Text>
            <Text style={metaDataValue}>{name}</Text>

            <Text style={metaDataLabel}>Email</Text>
            <Text style={metaDataValue}>
              <Link href={`mailto:${email}`} style={link}>{email}</Link>
            </Text>

            {phoneDisplay && (
              <>
                <Text style={metaDataLabel}>Phone</Text>
                <Text style={metaDataValue}>
                  {telHref.length >= 7 ? (
                    <Link href={`tel:${telHref}`} style={link}>{phoneDisplay}</Link>
                  ) : (
                    phoneDisplay
                  )}
                </Text>
              </>
            )}

            <Text style={metaDataLabel}>Message</Text>
            <Section style={messageShell}>
              <Text style={messageText}>{message}</Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footerWrap}>
            <Text style={footerLinks}>
              <Link href={`${baseUrl}`} style={{ color: "#ffffff", textDecoration: "none" }}>URTAILORSTAILOR</Link>
            </Text>
            <Text style={footerAddress}>
              Sent from the URTAILORSTAILOR site contact form.<br/>
              Reply-To is the sender&apos;s address.
            </Text>
          </Section>
        </Container>
        </div>
      </Body>
    </Html>
  );
}
