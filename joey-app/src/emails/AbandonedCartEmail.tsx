import {
  Body,
  Button,
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
} from "@react-email/components";
import * as React from "react";

export type AbandonedCartItem = {
  name: string;
  quantity: number;
  price: number;
  size?: string;
  fit?: string;
  color?: string;
  image?: string;
  isMadeToOrder?: boolean;
  isBespoke?: boolean;
  leadDays?: number;
};

export type AbandonedCartEmailProps = {
  customerName: string;
  items: AbandonedCartItem[];
  cartUrl?: string;
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
  fontSize: "32px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "0 0 12px 0",
  color: "#111111",
};

const statusText = {
  fontSize: "14px",
  color: "#555555",
  textAlign: "center" as const,
  margin: "0 0 24px 0",
  lineHeight: "1.6",
};

const button = {
  backgroundColor: "#333333",
  color: "#ffffff",
  padding: "12px 24px",
  fontSize: "13px",
  fontWeight: "bold",
  textDecoration: "none",
  letterSpacing: "1px",
};

const itemRow = {
  paddingBottom: "24px",
  marginBottom: "24px",
  borderBottom: "1px solid #eeeeee",
};

const itemImage = {
  width: "96px",
  height: "auto",
  display: "block",
  borderRadius: "6px",
};

const itemTitle = {
  fontSize: "14px",
  color: "#333333",
  fontWeight: "bold",
  margin: "0 0 8px 0",
};

const itemProp = {
  fontSize: "13px",
  color: "#555555",
  margin: "0 0 4px 0",
};

const priceText = {
  fontSize: "14px",
  color: "#333333",
  fontWeight: "bold",
  textAlign: "right" as const,
  margin: "0",
};

const footerWrap = {
  backgroundColor: "#f9f9f9",
  padding: "32px 48px",
  textAlign: "center" as const,
};

export default function AbandonedCartEmail({
  customerName = "there",
  items = [],
  cartUrl,
}: AbandonedCartEmailProps) {
  const firstName = customerName.split(" ")[0] || "there";
  const baseUrl = getBaseUrl();
  const checkoutUrl = cartUrl || `${baseUrl}/cart`;
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0,
  );
  const preview = `${firstName}, your JOEY pieces are still waiting.`;

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
        <div
          style={{
            backgroundColor: "#000000",
            backgroundImage: `url(${baseUrl}/collection_kpq24u.jpg)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            height: "320px",
            width: "100%",
            paddingTop: "56px",
            textAlign: "center",
          }}
        >
          <Img
            src={`${baseUrl}/white%20logo.png`}
            alt="JOEY The brand"
            style={{ width: "240px", height: "auto", margin: "0 auto", display: "block" }}
          />
        </div>

        <div style={{ marginTop: "-120px", width: "100%" }}>
          <Container style={container}>
            <Section style={card}>
              <Text style={nav}>
                <Link href={`${baseUrl}/shop`} style={navLink}>
                  SHOP
                </Link>
                &nbsp;&nbsp;•&nbsp;&nbsp;
                <Link href={`${baseUrl}/cart`} style={navLink}>
                  CART
                </Link>
                &nbsp;&nbsp;•&nbsp;&nbsp;
                <Link href={`${baseUrl}/contact`} style={navLink}>
                  CONTACT
                </Link>
              </Text>

              <Text style={headerSerif}>Still thinking it over, {firstName}?</Text>
              <Text style={statusText}>
                You left {items.length === 1 ? "a piece" : "a few pieces"} in your cart. We held them
                for you — complete checkout when you are ready.
              </Text>

              <Section style={{ textAlign: "center", marginBottom: "36px" }}>
                <Button href={checkoutUrl} style={button}>
                  Return to cart
                </Button>
              </Section>

              {items.map((item, index) => (
                <Row
                  key={`${item.name}-${index}`}
                  style={index !== items.length - 1 ? itemRow : { paddingBottom: "8px" }}
                >
                  <Column style={{ width: "120px" }} valign="middle">
                    {item.image ? (
                      <Img src={item.image} alt={item.name} style={itemImage} />
                    ) : (
                      <div style={{ width: "96px", height: "120px", backgroundColor: "#f4f4f4" }} />
                    )}
                  </Column>
                  <Column style={{ paddingLeft: "20px" }} valign="top">
                    <Text style={itemTitle}>{item.name}</Text>
                    {item.size ? (
                      <Text style={itemProp}>
                        Size: {item.size}
                        {item.fit ? ` (${item.fit} Fit)` : ""}
                      </Text>
                    ) : null}
                    {item.color ? <Text style={itemProp}>Color: {item.color}</Text> : null}
                    <Text style={itemProp}>Quantity: {item.quantity}</Text>
                  </Column>
                  <Column style={{ width: "90px" }} valign="bottom">
                    <Text style={priceText}>
                      GHC {(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString()}
                    </Text>
                  </Column>
                </Row>
              ))}

              <Row style={{ borderTop: "1px solid #eeeeee", paddingTop: "20px" }}>
                <Column>
                  <Text style={{ fontSize: "16px", color: "#111111", margin: "0", fontWeight: "bold" }}>
                    Subtotal
                  </Text>
                </Column>
                <Column>
                  <Text
                    style={{
                      fontSize: "16px",
                      color: "#111111",
                      margin: "0",
                      fontWeight: "bold",
                      textAlign: "right",
                    }}
                  >
                    GHC {subtotal.toLocaleString()}
                  </Text>
                </Column>
              </Row>
            </Section>

            <Section style={footerWrap}>
              <Text style={{ fontSize: "11px", color: "#888888", margin: "0", lineHeight: "1.6" }}>
                Accra, Ghana
                <br />
                © {new Date().getFullYear()} JOEY The brand. All Rights Reserved
                <br />
                You received this because items are still in your signed-in cart.
              </Text>
            </Section>
          </Container>
        </div>
      </Body>
    </Html>
  );
}
