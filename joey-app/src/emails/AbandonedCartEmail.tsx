import { Text } from "@react-email/components";
import * as React from "react";
import { getEmailBaseUrl } from "@/lib/emailAssets";
import { formatOrderAmount } from "@/lib/formatOrderAmount";
import EmailItemRows from "./EmailItemRows";
import EmailLayout from "./EmailLayout";
import {
  emailColors,
  emailFonts,
  emailParagraph,
} from "./emailStyles";

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

export default function AbandonedCartEmail({
  customerName = "there",
  items = [],
  cartUrl,
}: AbandonedCartEmailProps) {
  const firstName = customerName.split(" ")[0] || "there";
  const baseUrl = getEmailBaseUrl();
  const checkoutUrl = cartUrl || `${baseUrl}/cart`;
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0,
  );
  const preview = `${firstName}, your JOEY pieces are still waiting.`;

  return (
    <EmailLayout
      preview={preview}
      eyebrow="YOUR CONSIDERED SELECTION"
      title="Still on your mind?"
      ctaHref={checkoutUrl}
      ctaLabel="RETURN TO YOUR BAG"
      helpText="The pieces you chose are waiting. Return when you’re ready."
    >
      <div style={{ textAlign: "center" }}>
        <Text style={emailParagraph}>Hello {firstName},</Text>
        <Text style={emailParagraph}>
          You left {items.length === 1 ? "a piece" : "a few pieces"} in your cart. We’ll check
          current prices and availability when you return.
        </Text>
      </div>

      <EmailItemRows
        items={items.map((item) => {
          const meta = [
            item.color,
            item.size
              ? `SIZE ${item.size}${item.fit ? ` (${item.fit})` : ""}`
              : null,
            `QTY ${item.quantity}`,
          ]
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

      <table role="presentation" width="100%" style={{ marginTop: "22px" }}>
        <tbody>
          <tr>
            <td style={{ fontFamily: emailFonts.sans, fontSize: "12px", color: emailColors.body }}>
              SUBTOTAL
            </td>
            <td
              align="right"
              style={{
                fontFamily: emailFonts.serif,
                fontSize: "24px",
                color: emailColors.accent,
              }}
            >
              {formatOrderAmount(subtotal)}
            </td>
          </tr>
        </tbody>
      </table>
    </EmailLayout>
  );
}
