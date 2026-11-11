import { Link, Text } from "@react-email/components";
import * as React from "react";
import { formatPhoneDisplay } from "@/lib/formatPhoneDisplay";
import EmailLayout from "./EmailLayout";
import {
  emailColors,
  emailDetailBox,
  emailFonts,
  emailParagraph,
} from "./emailStyles";

export type ContactSiteMessageProps = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
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

  return (
    <EmailLayout
      preview={preview}
      eyebrow="STUDIO INBOX"
      title="A new inquiry."
      ctaHref={`mailto:${email}`}
      ctaLabel="REPLY BY EMAIL"
      helpText="This message was sent from the contact form on JOEY THE BRAND."
    >
      <div style={{ textAlign: "center" }}>
        <Text style={emailParagraph}>{subject}</Text>
      </div>

      <div style={emailDetailBox}>
        <Text
          style={{
            margin: "0 0 4px",
            fontFamily: emailFonts.sans,
            fontSize: "9px",
            letterSpacing: "2px",
            color: emailColors.soft,
          }}
        >
          FROM
        </Text>
        <Text style={{ ...emailParagraph, margin: "0 0 14px", color: emailColors.headline }}>
          {name}
        </Text>

        <Text
          style={{
            margin: "0 0 4px",
            fontFamily: emailFonts.sans,
            fontSize: "9px",
            letterSpacing: "2px",
            color: emailColors.soft,
          }}
        >
          EMAIL
        </Text>
        <Text style={{ ...emailParagraph, margin: "0 0 14px" }}>
          <Link href={`mailto:${email}`} style={{ color: emailColors.accent }}>
            {email}
          </Link>
        </Text>

        {phoneDisplay ? (
          <>
            <Text
              style={{
                margin: "0 0 4px",
                fontFamily: emailFonts.sans,
                fontSize: "9px",
                letterSpacing: "2px",
                color: emailColors.soft,
              }}
            >
              PHONE
            </Text>
            <Text style={{ ...emailParagraph, margin: "0 0 14px" }}>
              {telHref.length >= 7 ? (
                <Link href={`tel:${telHref}`} style={{ color: emailColors.accent }}>
                  {phoneDisplay}
                </Link>
              ) : (
                phoneDisplay
              )}
            </Text>
          </>
        ) : null}

        <Text
          style={{
            margin: "0 0 4px",
            fontFamily: emailFonts.sans,
            fontSize: "9px",
            letterSpacing: "2px",
            color: emailColors.soft,
          }}
        >
          MESSAGE
        </Text>
        <Text
          style={{
            ...emailParagraph,
            margin: 0,
            color: emailColors.headline,
            whiteSpace: "pre-wrap",
          }}
        >
          {message}
        </Text>
      </div>
    </EmailLayout>
  );
}
