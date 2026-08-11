/* eslint-disable @next/next/no-page-custom-font */
import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { formatPhoneDisplay } from "@/lib/formatPhoneDisplay";

export type ContactSiteMessageProps = {
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
};

const nav = {
  textAlign: "center" as const,
  marginBottom: "40px",
  fontSize: "12px",
  letterSpacing: "2px",
  color: "#333333",
  fontWeight: "bold",
  textTransform: "uppercase" as const,
};

const navLink = {
  color: "#333333",
  textDecoration: "none",
  margin: "0 12px",
};

const headerSerif = {
  fontFamily: '"Bodoni Moda", "Times New Roman", Times, serif',
  fontSize: "36px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "0 0 8px 0",
  color: "#111111",
};

const subHeaderText = {
  fontSize: "13px",
  color: "#888888",
  textAlign: "center" as const,
  margin: "0 0 40px 0",
  letterSpacing: "0.5px",
};

const metaDataLabel = {
  fontSize: "12px",
  color: "#999999",
  fontStyle: "italic",
  margin: "0 0 8px 0",
};

const metaDataValue = {
  fontSize: "14px",
  color: "#333333",
  margin: "0 0 24px 0",
  lineHeight: "1.5",
};

const link = {
  color: "#333333",
  textDecoration: "underline",
};

const messageShell = {
  backgroundColor: "#f9f9f9",
  border: "1px solid #eeeeee",
  borderRadius: "6px",
  padding: "24px",
  marginTop: "8px",
};

const messageText = {
  color: "#333333",
  fontSize: "14px",
  lineHeight: 1.6,
  margin: 0,
  whiteSpace: "pre-wrap" as const,
};

const footerWrap = {
  backgroundColor: "#f9f9f9",
  padding: "32px 48px",
  textAlign: "center" as const,
};

const footerLinks = {
  fontSize: "11px",
  fontWeight: "bold",
  color: "#333333",
  margin: "0 0 16px 0",
};

const footerAddress = {
  fontSize: "11px",
  color: "#888888",
  margin: "0",
  lineHeight: "1.6",
};

export default function ContactSiteMessage({
  name = "Jane Doe",
  email = "jane@example.com",
  phone = "+233 50 123 4567",
  subject = "General Inquiry",
  message = "Hello! I would like to inquire about...",
}: ContactSiteMessageProps) {
  const preview = `${subject} — ${name}`;
  const phoneDisplay = formatPhoneDisplay(phone);
  const telHref = phoneDisplay.replace(/[^\d+]/g, "");
  const baseUrl = getBaseUrl();

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
          backgroundImage: `url(${baseUrl}/collection_kpq24u.jpg)`, 
          backgroundSize: "cover", 
          backgroundPosition: "center",
          height: "380px",
          width: "100%",
          paddingTop: "60px", 
          textAlign: "center" 
        }}>
          <Img 
            src={`${baseUrl}/white%20logo.png`} 
            alt="JOEY The brand" 
            style={{ width: "280px", height: "auto", margin: "0 auto", display: "block" }} 
          />
        </div>

        {/* Main Card Wrapper (Negative margin pulls it up over the fixed-height header) */}
        <div style={{ marginTop: "-160px", width: "100%" }}>
          <Container style={container}>
            <Section style={card}>
            {/* Nav */}
            <Text style={nav}>
              <Link href={`${baseUrl}/shop`} style={navLink}>SHOP</Link>
              &nbsp;&nbsp;•&nbsp;&nbsp;
              <Link href={`${baseUrl}/account`} style={navLink}>ACCOUNT</Link>
              &nbsp;&nbsp;•&nbsp;&nbsp;
              <Link href={`${baseUrl}/contact`} style={navLink}>CONTACT</Link>
            </Text>

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
              <Link href={`${baseUrl}`} style={{ color: "#333333", textDecoration: "none" }}>JOEY The brand</Link> &nbsp;|&nbsp; 
              <Link href={`${baseUrl}/terms`} style={{ color: "#333333", textDecoration: "none" }}>Privacy Policy</Link>
            </Text>
            <Text style={footerAddress}>
              Accra, Ghana<br/>
              © {new Date().getFullYear()} JOEY The brand. All Rights Reserved<br/>
              This message was sent from the contact form on JOEY The brand.
            </Text>
          </Section>
        </Container>
        </div>
      </Body>
    </Html>
  );
}
