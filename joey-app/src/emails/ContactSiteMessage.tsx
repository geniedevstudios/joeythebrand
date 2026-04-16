import {
  Body,
  Column,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

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

  return "";
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
  display: "block",
  height: "64px",
  width: "auto",
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

const label = {
  color: "#71717a",
  fontSize: "10px",
  fontWeight: 700 as const,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  margin: "0 0 4px",
  lineHeight: 1.4,
};

const value = {
  color: "#18181b",
  fontSize: "15px",
  margin: "0 0 18px",
  lineHeight: 1.5,
};

const link = {
  color: "#272B36",
  textDecoration: "underline",
};

const messageShell = {
  backgroundColor: "#fafafa",
  border: "1px solid #e4e4e7",
  borderRadius: "6px",
  padding: "16px 18px",
  marginBottom: "20px",
};

const messageText = {
  color: "#27272a",
  fontSize: "15px",
  lineHeight: 1.65,
  margin: 0,
  whiteSpace: "pre-wrap" as const,
};

const hr = {
  borderColor: "#e4e4e7",
  margin: "20px 0",
};

const footer = {
  color: "#a1a1aa",
  fontSize: "11px",
  lineHeight: 1.55,
  margin: 0,
  textAlign: "center" as const,
};

export default function ContactSiteMessage({
  name,
  email,
  phone,
  subject,
  message,
}: ContactSiteMessageProps) {
  const preview = `${subject} — ${name}`;
  const phoneDisplay = phone.trim();
  const telHref = phoneDisplay.replace(/[^\d+]/g, "");
  const baseUrl = getBaseUrl();
  const logoUrl = baseUrl ? new URL("/white%20logo.png", baseUrl).toString() : "";

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
        <Container style={container}>
          <Section style={machineWrap}>
            <Section style={headerBand}>
              <Row>
                <Column style={{ width: "92px", verticalAlign: "middle", paddingRight: "24px" }}>
                  {logoUrl ? (
                    <Img
                      src={logoUrl}
                      alt="JOEY THE BRAND"
                      width={240}
                      height={64}
                      style={logoMark}
                    />
                  ) : (
                    <Text style={{ margin: 0, color: "#ffffff", fontWeight: 600 }}>JOEY</Text>
                  )}
                </Column>
                <Column style={topCopyCol}>
                  <Text style={brandLine}>JOEY The brand</Text>
                  <Text style={subLine}>Website contact — reply to this email to reach the sender.</Text>
                </Column>
              </Row>
            </Section>
            <Section style={perforation}>&nbsp;</Section>
            <Section style={card}>
              <Text style={label}>Name</Text>
              <Text style={value}>{name}</Text>

              <Text style={label}>Email</Text>
              <Text style={value}>
                <Link href={`mailto:${email}`} style={link}>
                  {email}
                </Link>
              </Text>

              {phoneDisplay ? (
                <>
                  <Text style={label}>Phone</Text>
                  <Text style={value}>
                    {telHref.length >= 7 ? (
                      <Link href={`tel:${telHref}`} style={link}>
                        {phoneDisplay}
                      </Link>
                    ) : (
                      phoneDisplay
                    )}
                  </Text>
                </>
              ) : null}

              <Text style={label}>Subject</Text>
              <Text style={value}>{subject}</Text>

              <Text style={label}>Message</Text>
              <Section style={messageShell}>
                <Text style={messageText}>{message}</Text>
              </Section>
            </Section>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            This message was sent from the contact form on your site. Reply-To is set to the sender&apos;s email
            address.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
