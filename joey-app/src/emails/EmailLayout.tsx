import { Body, Button, Head, Html, Link, Preview, Text } from "@react-email/components";
import * as React from "react";
import { EMAIL_HERO_URL, getEmailBaseUrl } from "@/lib/emailAssets";
import {
  emailColors,
  emailCta,
  emailEyebrow,
  emailFonts,
  emailHeadline,
  emailParagraph,
  emailResponsiveCss,
} from "./emailStyles";

export type EmailLayoutProps = {
  preview: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  ctaHref?: string;
  ctaLabel?: string;
  helpText?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export default function EmailLayout({
  preview,
  eyebrow,
  title,
  children,
  ctaHref,
  ctaLabel,
  helpText = "Questions? Reply to this email. We’re here to help.",
  secondaryHref,
  secondaryLabel,
}: EmailLayoutProps) {
  const baseUrl = getEmailBaseUrl();
  const year = new Date().getFullYear();

  return (
    <Html lang="en">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style dangerouslySetInnerHTML={{ __html: emailResponsiveCss }} />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, padding: 0, backgroundColor: emailColors.page }}>
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          style={{ backgroundColor: emailColors.page }}
        >
          <tbody>
            <tr>
              <td align="center" className="email-shell" style={{ padding: "28px 12px" }}>
                <table
                  role="presentation"
                  width="100%"
                  cellPadding={0}
                  cellSpacing={0}
                  style={{ maxWidth: "600px", backgroundColor: emailColors.shell }}
                >
                  <tbody>
                    <tr>
                      <td
                        className="hero"
                        height={240}
                        align="center"
                        style={{
                          height: "240px",
                          verticalAlign: "middle",
                          backgroundColor: emailColors.heroFallback,
                          backgroundImage: `url('${EMAIL_HERO_URL}')`,
                          backgroundPosition: "center",
                          backgroundSize: "cover",
                          backgroundRepeat: "no-repeat",
                        }}
                      >
                        <a
                          href={baseUrl}
                          aria-label="JOEY THE BRAND website"
                          className="hero-link"
                          style={{
                            display: "block",
                            height: "240px",
                            textDecoration: "none",
                          }}
                        >
                          &nbsp;
                        </a>
                      </td>
                    </tr>

                    <tr>
                      <td>
                        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
                          <tbody>
                            <tr>
                              <td
                                className="gutter"
                                width={28}
                                style={{ backgroundColor: emailColors.heroFallback }}
                              >
                                &nbsp;
                              </td>
                              <td
                                height={32}
                                style={{ backgroundColor: emailColors.panel }}
                              >
                                &nbsp;
                              </td>
                              <td
                                className="gutter"
                                width={28}
                                style={{ backgroundColor: emailColors.heroFallback }}
                              >
                                &nbsp;
                              </td>
                            </tr>
                            <tr>
                              <td className="gutter" width={28}>
                                &nbsp;
                              </td>
                              <td
                                className="panel-padding"
                                style={{
                                  padding: "0 32px 40px",
                                  backgroundColor: emailColors.panel,
                                }}
                              >
                                <Text style={emailEyebrow}>{eyebrow}</Text>
                                <h1 className="headline" style={emailHeadline}>
                                  {title}
                                </h1>

                                {children}

                                {ctaHref && ctaLabel ? (
                                  <table
                                    role="presentation"
                                    cellPadding={0}
                                    cellSpacing={0}
                                    align="center"
                                    style={{ margin: "28px auto 0" }}
                                  >
                                    <tbody>
                                      <tr>
                                        <td
                                          align="center"
                                          style={{ backgroundColor: emailColors.accent }}
                                        >
                                          <Button href={ctaHref} style={emailCta}>
                                            {ctaLabel}
                                          </Button>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                ) : null}

                                {helpText ? (
                                  <Text
                                    style={{
                                      ...emailParagraph,
                                      margin: "22px 0 0",
                                      fontSize: "12px",
                                      color: emailColors.muted,
                                      textAlign: "center",
                                    }}
                                  >
                                    {helpText}
                                  </Text>
                                ) : null}

                                {secondaryHref && secondaryLabel ? (
                                  <Text style={{ textAlign: "center", margin: "12px 0 0" }}>
                                    <Link
                                      href={secondaryHref}
                                      style={{
                                        fontFamily: emailFonts.sans,
                                        fontSize: "11px",
                                        color: "#88717c",
                                      }}
                                    >
                                      {secondaryLabel}
                                    </Link>
                                  </Text>
                                ) : null}
                              </td>
                              <td className="gutter" width={28}>
                                &nbsp;
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>

                    <tr>
                      <td
                        align="center"
                        style={{
                          padding: "32px 24px 0",
                          fontFamily: emailFonts.serif,
                          fontSize: "16px",
                          lineHeight: "1.5",
                          color: emailColors.body,
                        }}
                      >
                        Structure. Symbolism. Identity.
                      </td>
                    </tr>
                    <tr>
                      <td
                        align="center"
                        style={{
                          padding: "14px 24px 0",
                          fontFamily: emailFonts.sans,
                          fontSize: "11px",
                          lineHeight: "1.6",
                          color: emailColors.muted,
                        }}
                      >
                        Connect with us
                        <br />
                        <a
                          href="https://www.instagram.com/joeythebrand/"
                          style={{ color: emailColors.body, textDecoration: "none" }}
                        >
                          @joeythebrand
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style={{ padding: "24px 40px 28px" }}>
                        <div
                          style={{
                            borderTop: `1px solid ${emailColors.footerRule}`,
                            paddingTop: "18px",
                            fontFamily: emailFonts.sans,
                            fontSize: "10px",
                            lineHeight: "1.8",
                            color: emailColors.muted,
                          }}
                        >
                          © {year} JOEY THE BRAND. All rights reserved.
                          <br />
                          <a
                            href={baseUrl}
                            style={{ color: emailColors.body, textDecoration: "none" }}
                          >
                            joeythebrand.com
                          </a>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </Body>
    </Html>
  );
}
