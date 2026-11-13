import { Link, Text } from "@react-email/components";
import * as React from "react";
import { getEmailBaseUrl } from "@/lib/emailAssets";
import { formatOrderAmount } from "@/lib/formatOrderAmount";
import EmailItemRows from "./EmailItemRows";
import EmailLayout from "./EmailLayout";
import {
  emailColors,
  emailDetailBox,
  emailFonts,
  emailParagraph,
} from "./emailStyles";

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
    <EmailLayout
      preview={preview}
      eyebrow={isAdmin ? "STUDIO CHECKOUT" : "A LITTLE HELP WITH CHECKOUT"}
      title={isAdmin ? "A payment needs attention." : "Let’s make it yours."}
      ctaHref={isAdmin ? adminOrdersUrl || `${baseUrl}/account` : payUrl}
      ctaLabel={isAdmin ? "OPEN THE STUDIO" : "RETURN TO CHECKOUT"}
      helpText={
        isAdmin
          ? "A note from your Joey studio."
          : "If your bank shows a debit, please contact us before retrying."
      }
    >
      <div style={{ textAlign: "center" }}>
        <Text style={emailParagraph}>
          {isAdmin ? `${customerName}` : `Hello ${firstName},`}
        </Text>
        <Text style={emailParagraph}>
          {isAdmin
            ? "This customer started checkout and has not paid after 15 minutes. Call or email them if you want to help finish the order."
            : orderNumber
              ? `We haven’t confirmed payment for order ${orderNumber}. If you paid or see a debit, reply for help before trying again.`
              : "Checkout closed before we could confirm your payment. Your selection is saved. If you completed payment, please wait for confirmation or reply for help before trying again."}
        </Text>
        {orderNumber ? (
          <Text
            style={{
              margin: "20px 0 4px",
              fontFamily: emailFonts.sans,
              fontSize: "10px",
              letterSpacing: "1.5px",
              color: emailColors.meta,
            }}
          >
            {orderNumber}
          </Text>
        ) : null}
      </div>

      <EmailItemRows
        items={items.map((item) => {
          const meta = [item.color, item.size ? `SIZE ${item.size}` : null, `QTY ${item.quantity}`]
            .filter(Boolean)
            .join("  /  ");
          return {
            name: item.name,
            image: item.image,
            meta,
            amount: item.price * item.quantity,
          };
        })}
      />

      {isAdmin ? (
        <div style={emailDetailBox}>
          {customerPhone ? (
            <Text style={emailParagraph}>
              Call:{" "}
              <Link href={`tel:${customerPhone.replace(/\s+/g, "")}`} style={{ color: emailColors.accent }}>
                {customerPhone}
              </Link>
            </Text>
          ) : (
            <Text style={emailParagraph}>No phone on file yet.</Text>
          )}
          {customerEmail ? (
            <Text style={emailParagraph}>
              Email:{" "}
              <Link href={`mailto:${customerEmail}`} style={{ color: emailColors.accent }}>
                {customerEmail}
              </Link>
            </Text>
          ) : null}
          {total ? (
            <Text style={emailParagraph}>Total: {formatOrderAmount(total)}</Text>
          ) : null}
        </div>
      ) : null}
    </EmailLayout>
  );
}
