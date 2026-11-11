import { Img, Link, Text } from "@react-email/components";
import * as React from "react";
import { getEmailBaseUrl } from "@/lib/emailAssets";
import EmailLayout from "./EmailLayout";
import {
  emailColors,
  emailDetailBox,
  emailFonts,
  emailItemMeta,
  emailItemName,
  emailItemPrice,
  emailParagraph,
} from "./emailStyles";

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
  isAdmin?: boolean;
  adminOrdersUrl?: string;
  stockConflictFlagged?: boolean;
};

const DEFAULT_ADMIN_ORDERS_URL = "https://admin.joeythebrand.com/orders";

function isItemMto(item: OrderItem): boolean {
  return (
    item.fulfillmentType === "made_to_order" ||
    Boolean(item.isMadeToOrder) ||
    Boolean(item.isBespoke)
  );
}

function money(value: number) {
  return `GHC ${Number(value || 0).toLocaleString()}`;
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
  const baseUrl = getEmailBaseUrl();
  const formattedDate = new Date(dateOrdered).toLocaleDateString("en-US", {
    timeZone: "Africa/Accra",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const title = isAdmin
    ? stockConflictFlagged
      ? `Order hold — ${orderId}`
      : `A new paid order.`
    : `Your next chapter, confirmed.`;
  const eyebrow = isAdmin
    ? stockConflictFlagged
      ? "ACTION REQUIRED"
      : "STUDIO ORDER"
    : "YOUR JOEY ORDER";
  const greeting = isAdmin
    ? `${customerName}`
    : `Hello ${firstName || "there"},`;
  const statusCopy = isAdmin
    ? stockConflictFlagged
      ? "A late payment completed after reservation expiry and physical stock was no longer available. This order is held in Paid — Requires Resolution for your manual review."
      : "A verified payment has been received. The pieces and delivery details are below."
    : hasMto
      ? `Your payment is confirmed. Production for your Made to Order piece(s) (${maxLeadDays || 14} days) has begun.`
      : "Your payment is confirmed. Your pieces are now in our hands, ready for their next chapter.";
  const ctaHref = isAdmin ? adminOrdersUrl : `${baseUrl}/account`;
  const ctaLabel = isAdmin
    ? stockConflictFlagged
      ? "RESOLVE ORDER HOLD"
      : "OPEN THE STUDIO"
    : "VIEW YOUR ORDERS";

  const computedSubtotal =
    subtotal != null
      ? subtotal
      : items.reduce((sum, i) => sum + Number(i.price || 0) * Number(i.quantity || 1), 0);

  return (
    <EmailLayout
      preview={preview}
      eyebrow={eyebrow}
      title={title}
      ctaHref={ctaHref}
      ctaLabel={ctaLabel}
      helpText={
        isAdmin
          ? "A note from your Joey studio."
          : "Questions? Reply to this email. We’re here to help."
      }
    >
      <div style={{ textAlign: "center" }}>
        <Text style={emailParagraph}>{greeting}</Text>
        <Text style={emailParagraph}>{statusCopy}</Text>
        <Text
          style={{
            margin: "20px 0 4px",
            fontFamily: emailFonts.sans,
            fontSize: "10px",
            letterSpacing: "1.5px",
            color: emailColors.meta,
          }}
        >
          {orderId}
        </Text>
      </div>

      {isAdmin && stockConflictFlagged ? (
        <div
          style={{
            ...emailDetailBox,
            backgroundColor: "#fdf2f2",
            border: "1px solid #f0d4d4",
          }}
        >
          <Text style={{ ...emailParagraph, margin: 0, color: "#7f1d1d" }}>
            <strong>Action required:</strong> Payment succeeded after the inventory reservation
            window expired, and another customer claimed the remaining Ready to Wear stock. Open
            Admin Orders to convert the item to Made to Order or arrange a refund.
          </Text>
        </div>
      ) : null}

      {isMixed ? (
        <div style={emailDetailBox}>
          <Text style={{ ...emailParagraph, margin: 0 }}>
            <strong>Combined shipment:</strong> This order contains both Ready to Wear and Made to
            Order pieces. By default, all items ship together once production is completed (
            {maxLeadDays || 14} days from payment).
          </Text>
        </div>
      ) : null}

      <table
        role="presentation"
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        style={{ marginTop: "12px" }}
      >
        <tbody>
          {items.map((item, index) => {
            const mto = isItemMto(item);
            const lead = item.leadDays ?? item.bespokeLeadDays ?? 14;
            const meta = [
              item.color,
              item.size
                ? `SIZE ${item.size}${item.fit ? ` (${item.fit})` : ""}`
                : null,
              item.combo ? `COMBO ${item.combo}` : null,
              `QTY ${item.quantity}`,
              mto ? `MTO · ${lead}D` : null,
            ]
              .filter(Boolean)
              .join("  /  ");
            return (
              <tr key={`${item.name}-${index}`}>
                <td
                  style={{
                    padding: "20px 0",
                    borderBottom:
                      index === items.length - 1 ? "none" : `1px solid ${emailColors.divider}`,
                  }}
                >
                  <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
                    <tbody>
                      <tr>
                        {item.image ? (
                          <td width={112} valign="top">
                            <Img
                              src={item.image}
                              alt={item.name}
                              width={112}
                              style={{
                                display: "block",
                                width: "112px",
                                maxWidth: "112px",
                                height: "auto",
                                border: 0,
                              }}
                            />
                          </td>
                        ) : null}
                        <td
                          valign="middle"
                          style={{ paddingLeft: item.image ? "20px" : "0" }}
                        >
                          <Text style={emailItemName}>{item.name}</Text>
                          <Text style={emailItemMeta}>{meta}</Text>
                          {mto && item.estimatedReadyDate ? (
                            <Text style={{ ...emailItemMeta, marginTop: "6px" }}>
                              Est. ready {item.estimatedReadyDate}
                            </Text>
                          ) : null}
                          <Text style={emailItemPrice}>
                            {money(item.price * item.quantity)}
                          </Text>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <table role="presentation" width="100%" style={{ marginTop: "22px" }}>
        <tbody>
          {discount > 0 ? (
            <tr>
              <td style={{ fontFamily: emailFonts.sans, fontSize: "12px", color: emailColors.body }}>
                Subtotal
              </td>
              <td
                align="right"
                style={{ fontFamily: emailFonts.sans, fontSize: "12px", color: emailColors.body }}
              >
                {money(computedSubtotal)}
              </td>
            </tr>
          ) : null}
          {discount > 0 ? (
            <tr>
              <td style={{ fontFamily: emailFonts.sans, fontSize: "12px", color: emailColors.body }}>
                Discount
              </td>
              <td
                align="right"
                style={{ fontFamily: emailFonts.sans, fontSize: "12px", color: emailColors.body }}
              >
                −{money(discount)}
              </td>
            </tr>
          ) : null}
          {shippingCost > 0 ? (
            <tr>
              <td style={{ fontFamily: emailFonts.sans, fontSize: "12px", color: emailColors.body }}>
                Shipping
              </td>
              <td
                align="right"
                style={{ fontFamily: emailFonts.sans, fontSize: "12px", color: emailColors.body }}
              >
                {money(shippingCost)}
              </td>
            </tr>
          ) : null}
          <tr>
            <td
              style={{
                fontFamily: emailFonts.sans,
                fontSize: "12px",
                color: emailColors.body,
                paddingTop: "8px",
              }}
            >
              TOTAL PAID
            </td>
            <td
              align="right"
              style={{
                fontFamily: emailFonts.serif,
                fontSize: "24px",
                color: emailColors.accent,
                paddingTop: "8px",
              }}
            >
              {money(total)}
            </td>
          </tr>
        </tbody>
      </table>

      <div style={emailDetailBox}>
        <Text
          style={{
            margin: 0,
            fontFamily: emailFonts.sans,
            fontSize: "9px",
            letterSpacing: "2px",
            color: emailColors.soft,
          }}
        >
          DELIVER TO
        </Text>
        <Text style={emailParagraph}>{customerName}</Text>
        {shippingAddress.split("\n").map((line, i) => (
          <Text key={i} style={{ ...emailParagraph, margin: i === 0 ? "8px 0 0" : "0" }}>
            {line}
          </Text>
        ))}
        <Text style={{ ...emailParagraph, marginTop: "14px" }}>Ordered {formattedDate}</Text>
        <Text style={emailParagraph}>
          <Link href={`${baseUrl}/shop`} style={{ color: emailColors.accent }}>
            Continue shopping
          </Link>
        </Text>
      </div>
    </EmailLayout>
  );
}
