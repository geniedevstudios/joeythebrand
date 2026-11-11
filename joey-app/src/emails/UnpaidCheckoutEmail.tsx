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
              ? `Paystack reported payment for order ${orderNumber} as unfinished. Return to checkout to try again, or reply for help. If you already paid, ignore this.`
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
            <Text style={emailParagraph}>Total: GHC {Number(total).toLocaleString()}</Text>
          ) : null}
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
            const meta = [item.color, item.size ? `SIZE ${item.size}` : null, `QTY ${item.quantity}`]
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
                        <td valign="middle" style={{ paddingLeft: item.image ? "20px" : "0" }}>
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
    </EmailLayout>
  );
}
