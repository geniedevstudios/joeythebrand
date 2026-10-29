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
import { EMAIL_LOGO_URL, getEmailBaseUrl } from "@/lib/emailAssets";

export type UnpaidCheckoutItem = {
  name: string;
  quantity: number;
  price: number;
  size?: string;
  color?: string;
  image?: string;
};

export type UnpaidCheckoutEmailProps = {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  orderNumber?: string;
  items: UnpaidCheckoutItem[];
  total?: number;
  checkoutUrl?: string;
  adminOrdersUrl?: string;
  isAdmin?: boolean;
};

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

const headerSerif = {
  fontFamily: '"Bodoni Moda", "Times New Roman", Times, serif',
  fontSize: "32px",
  fontWeight: "bold" as const,
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
  fontWeight: "bold" as const,
  textDecoration: "none",
  letterSpacing: "1px",
};

const itemTitle = {
  fontSize: "14px",
  color: "#333333",
  fontWeight: "bold" as const,
  margin: "0 0 8px 0",
};

const itemProp = {
  fontSize: "13px",
  color: "#555555",
  margin: "0 0 4px 0",
};

export default function UnpaidCheckoutEmail({
  customerName = "there",
  customerEmail,
  customerPhone,
  orderNumber,
  items = [],
  total = 0,
  checkoutUrl,
  adminOrdersUrl,
  isAdmin = false,
}: UnpaidCheckoutEmailProps) {
  const firstName = customerName.split(" ")[0] || "there";
  const baseUrl = getEmailBaseUrl();
  const payUrl = checkoutUrl || `${baseUrl}/checkout`;
  const preview = isAdmin
    ? `Unpaid checkout — ${customerName}${orderNumber ? ` (${orderNumber})` : ""}`
    : `${firstName}, did something go wrong at checkout?`;

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
            height: "160px",
            width: "100%",
            paddingTop: "32px",
            textAlign: "center",
          }}
        >
          <Img
            src={EMAIL_LOGO_URL}
            alt="JOEY The brand"
            width={160}
            height={160}
            style={{ width: "160px", height: "auto", margin: "0 auto", display: "block" }}
          />
        </div>
        <Container style={container}>
          <Section style={card}>
            {isAdmin ? (
              <>
                <Text style={headerSerif}>Unpaid checkout</Text>
                <Text style={statusText}>
                  {customerName} started checkout and has not paid after 15 minutes. Call or email
                  them if you want to help finish the order.
                </Text>
                <Text style={{ ...itemProp, textAlign: "center" }}>
                  {orderNumber ? `Order ${orderNumber}` : "No order number yet (still on checkout)"}
                  {total ? ` · GHC ${Number(total).toLocaleString()}` : ""}
                </Text>
                <Text style={{ ...itemProp, textAlign: "center", marginBottom: "16px" }}>
                  {customerPhone ? (
                    <>
                      Call:{" "}
                      <Link href={`tel:${customerPhone.replace(/\s+/g, "")}`}>{customerPhone}</Link>
                      <br />
                    </>
                  ) : (
                    "No phone on file yet."
                  )}
                  {customerEmail ? (
                    <>
                      Email: <Link href={`mailto:${customerEmail}`}>{customerEmail}</Link>
                    </>
                  ) : null}
                </Text>
                <Section style={{ textAlign: "center", marginBottom: "28px" }}>
                  <Button href={adminOrdersUrl || `${baseUrl}/account`} style={button}>
                    Open orders
                  </Button>
                </Section>
              </>
            ) : (
              <>
                <Text style={headerSerif}>Having trouble completing payment?</Text>
                <Text style={statusText}>
                  {orderNumber
                    ? `We noticed payment for order ${orderNumber} did not finish. If Paystack stalled or something looked off, you can try again or reply and we will help. If you already paid, ignore this.`
                    : "You reached checkout but the order was not completed. If something went wrong, reply to this email or return to checkout. If you already paid, ignore this."}
                </Text>
                <Section style={{ textAlign: "center", marginBottom: "28px" }}>
                  <Button href={payUrl} style={button}>
                    Return to checkout
                  </Button>
                </Section>
              </>
            )}

            {items.map((item, index) => (
              <Row key={`${item.name}-${index}`} style={{ paddingBottom: "16px" }}>
                <Column>
                  <Text style={itemTitle}>{item.name}</Text>
                  {item.size ? <Text style={itemProp}>Size: {item.size}</Text> : null}
                  {item.color ? <Text style={itemProp}>Color: {item.color}</Text> : null}
                  <Text style={itemProp}>Qty: {item.quantity}</Text>
                </Column>
                <Column style={{ width: "90px" }}>
                  <Text style={{ ...itemTitle, textAlign: "right" }}>
                    GHC {(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString()}
                  </Text>
                </Column>
              </Row>
            ))}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
