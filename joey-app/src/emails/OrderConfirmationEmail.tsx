import {
  Body,
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
  Button,
} from "@react-email/components";
import * as React from "react";

export type OrderItem = {
  name: string;
  quantity: number;
  price: number;
  size?: string;
  fit?: string;
  color?: string;
  combo?: string;
  image?: string;
  fulfillmentType?: "ready_to_wear" | "made_to_order";
  isMadeToOrder?: boolean;
  isBespoke?: boolean;
  leadDays?: number;
  bespokeLeadDays?: number;
  estimatedReadyDate?: string;
  productionStatus?: string;
};

export type OrderConfirmationEmailProps = {
  customerName: string;
  orderId: string;
  items: OrderItem[];
  subtotal?: number;
  discount?: number;
  shippingCost?: number;
  total: number;
  shippingAddress: string;
  dateOrdered?: string;
  /** When true, copy is worded for the store admin and CTA links to the admin orders page. */
  isAdmin?: boolean;
  adminOrdersUrl?: string;
  /** True when a late payment completed after reservation expiry and physical stock was taken. */
  stockConflictFlagged?: boolean;
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

const mtoBadgeStyle = {
  display: "inline-block",
  fontSize: "11px",
  fontWeight: "bold",
  color: "#3f3f46",
  backgroundColor: "#f4f4f5",
  border: "1px solid #d4d4d8",
  padding: "3px 8px",
  borderRadius: "4px",
  marginTop: "6px",
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

const DEFAULT_ADMIN_ORDERS_URL = "https://admin.joeythebrand.com/orders";

function isItemMto(item: OrderItem): boolean {
  return (
    item.fulfillmentType === "made_to_order" ||
    Boolean(item.isMadeToOrder) ||
    Boolean(item.isBespoke)
  );
}

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
    },
  ],
  subtotal,
  discount = 0,
  shippingCost = 0,
  total = 175,
  shippingAddress = "123 Evergreen Lane\nAnytown, NY 45678",
  dateOrdered = new Date().toISOString(),
  isAdmin = false,
  adminOrdersUrl = DEFAULT_ADMIN_ORDERS_URL,
  stockConflictFlagged = false,
}: OrderConfirmationEmailProps) {
  const firstName = customerName.split(" ")[0];
  const hasMto = items.some(isItemMto);
  const hasRtw = items.some((i) => !isItemMto(i));
  const isMixed = hasMto && hasRtw;
  const maxLeadDays = items.reduce(
    (max, i) => (isItemMto(i) ? Math.max(max, Number(i.leadDays ?? i.bespokeLeadDays ?? 14)) : max),
    0,
  );

  const preview = isAdmin
    ? stockConflictFlagged
      ? `ACTION REQUIRED: Order ${orderId} Paid (Stock Conflict Hold)`
      : `New order ${orderId} from ${customerName}.`
    : `Thanks for your order, ${customerName}.`;
  const baseUrl = getBaseUrl();
  const formattedDate = new Date(dateOrdered).toLocaleDateString("en-US", {
    timeZone: "Africa/Accra",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const headline = isAdmin
    ? stockConflictFlagged
      ? `Order Hold — ${orderId}`
      : `New order from ${firstName}.`
    : `Thanks for your order, ${firstName}.`;
  const statusCopy = isAdmin
    ? stockConflictFlagged
      ? "A late payment completed after reservation expiry and physical stock was no longer available. This order is held in 'Paid — Requires Resolution' for your manual review."
      : "A customer just placed this order. Open the admin panel to process it."
    : hasMto
      ? `Your payment is confirmed. Production for your Made to Order piece(s) (${maxLeadDays || 14} days) has begun.`
      : "Your order is confirmed. We will be processing it shortly.";
  const ctaHref = isAdmin ? adminOrdersUrl : `${baseUrl}/account`;
  const ctaLabel = isAdmin
    ? stockConflictFlagged
      ? "Resolve Order Hold in Admin"
      : "View orders in admin"
    : "Track your order";

  const computedSubtotal =
    subtotal != null
      ? subtotal
      : items.reduce((sum, i) => sum + Number(i.price || 0) * Number(i.quantity || 1), 0);

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
        <div
          style={{
            backgroundColor: "#000000",
            backgroundImage: `url(${baseUrl}/collection_kpq24u.jpg)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            height: "380px",
            width: "100%",
            paddingTop: "60px",
            textAlign: "center",
          }}
        >
          <Img
            src={`${baseUrl}/white%20logo.png`}
            alt="JOEY The brand"
            style={{ width: "280px", height: "auto", margin: "0 auto", display: "block" }}
          />
        </div>

        {/* Main Card Wrapper */}
        <div style={{ marginTop: "-160px", width: "100%" }}>
          <Container style={container}>
            <Section style={card}>
              {/* Nav */}
              <Text style={nav}>
                <Link href={`${baseUrl}/shop`} style={navLink}>
                  SHOP
                </Link>
                &nbsp;&nbsp;•&nbsp;&nbsp;
                <Link href={`${baseUrl}/account`} style={navLink}>
                  ACCOUNT
                </Link>
                &nbsp;&nbsp;•&nbsp;&nbsp;
                <Link href={`${baseUrl}/contact`} style={navLink}>
                  CONTACT
                </Link>
              </Text>

              {/* Header */}
              <Text style={headerSerif}>{headline}</Text>
              <Text style={orderNumberText}>Order No. {orderId}</Text>

              {isAdmin && stockConflictFlagged ? (
                <div
                  style={{
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "6px",
                    padding: "16px",
                    marginBottom: "28px",
                    fontSize: "13px",
                    color: "#991b1b",
                    lineHeight: "1.5",
                  }}
                >
                  <strong>Action Required (Paid — Requires Resolution):</strong> Payment succeeded after the inventory reservation window expired, and another customer claimed the remaining Ready to Wear stock. This order has been placed on operational hold. Please open the Admin Orders panel to either convert the item to Made to Order or arrange a refund.
                </div>
              ) : null}

              {/* Meta Data */}
              <Row>
                <Column style={{ width: "33%", paddingRight: "16px" }} valign="top">
                  <Text style={metaDataLabel}>Shipping to</Text>
                  <Text style={metaDataValue}>
                    {customerName}
                    <br />
                    {shippingAddress.split("\n").map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        <br />
                      </React.Fragment>
                    ))}
                  </Text>
                </Column>
                <Column style={{ width: "33%", paddingRight: "16px" }} valign="top">
                  <Text style={metaDataLabel}>Billed to</Text>
                  <Text style={metaDataValue}>
                    {customerName}
                    <br />
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
              <Text style={statusText}>{statusCopy}</Text>
              <Section style={btnContainer}>
                <Button href={ctaHref} style={button}>
                  {ctaLabel}
                </Button>
              </Section>

              {isMixed ? (
                <div
                  style={{
                    backgroundColor: "#f4f4f5",
                    border: "1px solid #d4d4d8",
                    borderRadius: "6px",
                    padding: "14px 16px",
                    marginBottom: "28px",
                    fontSize: "12px",
                    color: "#3f3f46",
                    lineHeight: "1.5",
                  }}
                >
                  <strong>Combined Shipment Notice:</strong> This order contains both Ready to Wear and Made to Order pieces. By default, all items will ship together once production is completed ({maxLeadDays || 14} days from payment).
                </div>
              ) : null}

              {/* Summary Title */}
              <Text style={sectionTitle}>{isAdmin ? "Order Summary" : "Your Order Summary"}</Text>

              {/* Items */}
              {items.map((item, index) => {
                const mto = isItemMto(item);
                const lead = item.leadDays ?? item.bespokeLeadDays ?? 14;
                return (
                  <Row
                    key={index}
                    style={
                      index !== items.length - 1
                        ? itemRow
                        : { paddingBottom: "24px", marginBottom: "24px" }
                    }
                  >
                    <Column style={{ width: "150px" }} valign="middle">
                      {item.image ? (
                        <Img src={item.image} alt={item.name} style={itemImage} />
                      ) : (
                        <div style={{ width: "120px", height: "120px", backgroundColor: "#f4f4f4" }}></div>
                      )}
                    </Column>
                    <Column style={{ paddingLeft: "24px" }} valign="top">
                      <Text style={itemTitle}>{item.name}</Text>
                      {item.size && (
                        <Text style={itemProp}>
                          Size: {item.size}
                          {item.fit ? ` (${item.fit} Fit)` : ""}
                        </Text>
                      )}
                      {item.color && <Text style={itemProp}>Color: {item.color}</Text>}
                      {item.combo && <Text style={itemProp}>Combo: {item.combo}</Text>}
                      {mto ? (
                        <div>
                          <span style={mtoBadgeStyle}>
                            Made to Order · {lead} days production
                          </span>
                          {item.estimatedReadyDate ? (
                            <Text style={{ ...itemProp, fontSize: "12px", marginTop: "6px", color: "#52525b" }}>
                              Est. Production Ready: {item.estimatedReadyDate}
                            </Text>
                          ) : null}
                        </div>
                      ) : null}
                      <Text style={{ ...itemProp, marginTop: "12px" }}>Quantity: {item.quantity}</Text>
                    </Column>
                    <Column style={{ width: "90px" }} valign="bottom">
                      <Text style={priceText}>GHC {(item.price * item.quantity).toLocaleString()}</Text>
                    </Column>
                  </Row>
                );
              })}

              {/* Totals */}
              <Row style={{ borderTop: "1px solid #eeeeee", paddingTop: "24px" }}>
                <Column style={{ width: "50%" }}></Column>
                <Column style={{ width: "25%" }}>
                  <Text style={totalsRow}>Subtotal</Text>
                  {discount > 0 ? <Text style={totalsRow}>Discount</Text> : null}
                  {shippingCost > 0 ? <Text style={totalsRow}>Shipping</Text> : null}
                  <Text style={grandTotalRow}>Total</Text>
                </Column>
                <Column style={{ width: "25%" }}>
                  <Text style={totalsVal}>GHC {computedSubtotal.toLocaleString()}</Text>
                  {discount > 0 ? (
                    <Text style={totalsVal}>-GHC {discount.toLocaleString()}</Text>
                  ) : null}
                  {shippingCost > 0 ? (
                    <Text style={totalsVal}>GHC {shippingCost.toLocaleString()}</Text>
                  ) : null}
                  <Text style={grandTotalVal}>GHC {total.toLocaleString()}</Text>
                </Column>
              </Row>
            </Section>

            {/* Footer */}
            <Section style={footerWrap}>
              <Text style={footerLinks}>
                <Link href={`${baseUrl}`} style={{ color: "#333333", textDecoration: "none" }}>
                  JOEY The brand
                </Link>{" "}
                &nbsp;|&nbsp;
                <Link href={`${baseUrl}/terms`} style={{ color: "#333333", textDecoration: "none" }}>
                  Privacy Policy
                </Link>{" "}
                &nbsp;|&nbsp;
                <Link href={`${baseUrl}/terms`} style={{ color: "#333333", textDecoration: "none" }}>
                  Terms of Service
                </Link>
              </Text>
              <Text style={footerAddress}>
                Accra, Ghana
                <br />
                © {new Date().getFullYear()} JOEY The brand. All Rights Reserved
                <br />
                If you prefer not to receive emails like this from JOEY, you may unsubscribe.
              </Text>
            </Section>
          </Container>
        </div>
      </Body>
    </Html>
  );
}
