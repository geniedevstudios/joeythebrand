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
  Button,
} from "@react-email/components";
import * as React from "react";

export type OrderItem = {
  name: string;
  quantity: number;
  price: number;
  size?: string;
  color?: string;
  image?: string;
};

export type OrderConfirmationEmailProps = {
  customerName: string;
  orderId: string;
  items: OrderItem[];
  total: number;
  shippingAddress: string;
  dateOrdered?: string;
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
  fontFamily:
    '"Helvetica Neue", Helvetica, Arial, sans-serif',
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

const orderNumberText = {
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
  fontSize: "13px",
  color: "#333333",
  margin: "0",
  lineHeight: "1.5",
};

const divider = {
  borderTop: "1px dashed #dddddd",
  margin: "40px 0",
};

const statusText = {
  fontSize: "12px",
  color: "#888888",
  textAlign: "center" as const,
  margin: "0 0 24px 0",
};

const btnContainer = {
  textAlign: "center" as const,
  marginBottom: "40px",
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

const sectionTitle = {
  fontSize: "12px",
  color: "#333333",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "0 0 32px 0",
  borderBottom: "1px solid #eeeeee",
  paddingBottom: "16px",
};

const itemRow = {
  paddingBottom: "24px",
  marginBottom: "24px",
  borderBottom: "1px solid #eeeeee",
};

const itemImage = {
  width: "120px",
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

const totalsRow = {
  fontSize: "13px",
  color: "#555555",
  margin: "0 0 8px 0",
};

const totalsVal = {
  fontSize: "13px",
  color: "#333333",
  textAlign: "right" as const,
  margin: "0 0 8px 0",
};

const grandTotalRow = {
  fontSize: "18px",
  color: "#111111",
  margin: "16px 0 0 0",
};

const grandTotalVal = {
  fontSize: "18px",
  color: "#111111",
  textAlign: "right" as const,
  margin: "16px 0 0 0",
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

export default function OrderConfirmationEmail({
  customerName = "Jane",
  orderId = "58392743",
  items = [
    {
      name: "The Modern Oxford",
      size: "7.5",
      color: "Black",
      quantity: 1,
      price: 175,
      image: "https://via.placeholder.com/150",
    }
  ],
  total = 175,
  shippingAddress = "123 Evergreen Lane\nAnytown, NY 45678",
  dateOrdered = new Date().toISOString(),
}: OrderConfirmationEmailProps) {
  const preview = `Thanks for your order, ${customerName}.`;
  const baseUrl = getBaseUrl();
  const formattedDate = new Date(dateOrdered).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

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
          height: "380px", // FIXED HEIGHT forces it to stop
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
            <Text style={headerSerif}>Thanks for your order, {customerName.split(" ")[0]}.</Text>
            <Text style={orderNumberText}>Order No. {orderId}</Text>

            {/* Meta Data */}
            <Row>
              <Column style={{ width: "33%", paddingRight: "16px" }} valign="top">
                <Text style={metaDataLabel}>Shipping to</Text>
                <Text style={metaDataValue}>
                  {customerName}<br/>
                  {shippingAddress.split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                      {line}<br/>
                    </React.Fragment>
                  ))}
                </Text>
              </Column>
              <Column style={{ width: "33%", paddingRight: "16px" }} valign="top">
                <Text style={metaDataLabel}>Billed to</Text>
                <Text style={metaDataValue}>
                  {customerName}<br/>
                  Paystack Payment
                </Text>
              </Column>
              <Column style={{ width: "33%" }} valign="top">
                <Text style={metaDataLabel}>Date ordered</Text>
                <Text style={metaDataValue}>{formattedDate}</Text>
              </Column>
            </Row>

            {/* Divider */}
            <div style={divider}></div>

            {/* Status & CTA */}
            <Text style={statusText}>
              Your order is on its way. We will be processing it shortly.
            </Text>
            <Section style={btnContainer}>
              <Button href={`${baseUrl}/account`} style={button}>
                Track your order
              </Button>
            </Section>

            {/* Summary Title */}
            <Text style={sectionTitle}>Your Order Summary</Text>

            {/* Items */}
            {items.map((item, index) => (
              <Row key={index} style={index !== items.length - 1 ? itemRow : { paddingBottom: "24px", marginBottom: "24px" }}>
                <Column style={{ width: "150px" }} valign="middle">
                  {item.image ? (
                    <Img src={item.image} alt={item.name} style={itemImage} />
                  ) : (
                    <div style={{ width: "120px", height: "120px", backgroundColor: "#f4f4f4" }}></div>
                  )}
                </Column>
                <Column style={{ paddingLeft: "24px" }} valign="top">
                  <Text style={itemTitle}>{item.name}</Text>
                  {item.size && <Text style={itemProp}>Size: {item.size}</Text>}
                  {item.color && <Text style={itemProp}>Color: {item.color}</Text>}
                  <Text style={{ ...itemProp, marginTop: "16px" }}>Quantity: {item.quantity}</Text>
                </Column>
                <Column style={{ width: "80px" }} valign="bottom">
                  <Text style={priceText}>GHC {(item.price * item.quantity).toLocaleString()}</Text>
                </Column>
              </Row>
            ))}

            {/* Totals */}
            <Row style={{ borderTop: "1px solid #eeeeee", paddingTop: "24px" }}>
              <Column style={{ width: "50%" }}></Column>
              <Column style={{ width: "25%" }}>
                <Text style={totalsRow}>Subtotal</Text>
                {/* <Text style={totalsRow}>Shipping</Text> */}
                <Text style={grandTotalRow}>Total</Text>
              </Column>
              <Column style={{ width: "25%" }}>
                <Text style={totalsVal}>GHC {total.toLocaleString()}</Text>
                {/* <Text style={totalsVal}>GHC 0</Text> */}
                <Text style={grandTotalVal}>GHC {total.toLocaleString()}</Text>
              </Column>
            </Row>
          </Section>

          {/* Footer */}
          <Section style={footerWrap}>
            <Text style={footerLinks}>
              <Link href={`${baseUrl}`} style={{ color: "#333333", textDecoration: "none" }}>JOEY The brand</Link> &nbsp;|&nbsp; 
              <Link href={`${baseUrl}/terms`} style={{ color: "#333333", textDecoration: "none" }}>Privacy Policy</Link> &nbsp;|&nbsp; 
              <Link href={`${baseUrl}/terms`} style={{ color: "#333333", textDecoration: "none" }}>Terms of Service</Link>
            </Text>
            <Text style={footerAddress}>
              Accra, Ghana<br/>
              © {new Date().getFullYear()} JOEY The brand. All Rights Reserved<br/>
              If you prefer not to receive emails like this from JOEY, you may unsubscribe.
            </Text>
          </Section>
        </Container>
        </div>
      </Body>
    </Html>
  );
}
