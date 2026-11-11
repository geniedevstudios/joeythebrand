import { Img, Text } from "@react-email/components";
import * as React from "react";
import { getEmailBaseUrl } from "@/lib/emailAssets";
import EmailLayout from "./EmailLayout";
import {
  emailColors,
  emailFonts,
  emailItemMeta,
  emailItemName,
  emailItemPrice,
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

      <table
        role="presentation"
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        style={{ marginTop: "12px" }}
      >
        <tbody>
          {items.map((item, index) => {
            const meta = [
              item.color,
              item.size
                ? `SIZE ${item.size}${item.fit ? ` (${item.fit})` : ""}`
                : null,
              `QTY ${item.quantity}`,
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
                          <td width={112} style={{ verticalAlign: "top" }}>
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
                          style={{
                            verticalAlign: "middle",
                            paddingLeft: item.image ? "20px" : "0",
                          }}
                        >
                          <Text style={emailItemName}>{item.name}</Text>
                          <Text style={emailItemMeta}>{meta}</Text>
                          <Text style={emailItemPrice}>
                            GHC{" "}
                            {(
                              Number(item.price || 0) * Number(item.quantity || 1)
                            ).toLocaleString()}
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
              GHC {subtotal.toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>
    </EmailLayout>
  );
}
