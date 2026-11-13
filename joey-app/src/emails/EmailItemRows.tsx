import { Img, Text } from "@react-email/components";
import { getEmailBaseUrl } from "@/lib/emailAssets";
import { formatOrderAmount } from "@/lib/formatOrderAmount";
import { emailColors, emailItemMeta, emailItemName, emailItemPrice } from "./emailStyles";

type EmailItem = {
  name: string;
  image?: string;
  meta: string;
  amount: number;
  detail?: string;
};

function imageUrl(raw: string | undefined) {
  if (!raw?.trim()) return undefined;
  try {
    const url = new URL(raw, getEmailBaseUrl());
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export default function EmailItemRows({ items }: { items: EmailItem[] }) {
  if (items.length === 0) return null;

  return (
    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ marginTop: "12px" }}>
      <tbody>
        {items.map((item, index) => {
          const src = imageUrl(item.image);
          return (
            <tr key={`${item.name}-${index}`}>
              <td style={{ padding: "20px 0", borderBottom: `1px solid ${emailColors.divider}` }}>
                <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
                  <tbody>
                    <tr>
                      {src ? (
                        <td className="item-image" width={112} valign="top">
                          <Img
                            className="item-image"
                            src={src}
                            alt={item.name}
                            width={112}
                            style={{ display: "block", width: "112px", maxWidth: "112px", height: "auto", border: 0 }}
                          />
                        </td>
                      ) : null}
                      <td
                        valign="middle"
                        className={src ? "item-copy" : undefined}
                        style={{ paddingLeft: src ? "20px" : "0" }}
                      >
                        <Text style={emailItemName}>{item.name}</Text>
                        <Text style={emailItemMeta}>{item.meta}</Text>
                        {item.detail ? <Text style={{ ...emailItemMeta, marginTop: "6px" }}>{item.detail}</Text> : null}
                        <Text style={emailItemPrice}>{formatOrderAmount(item.amount)}</Text>
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
  );
}
