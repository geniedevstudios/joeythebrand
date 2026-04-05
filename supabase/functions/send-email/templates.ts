/** Escape user-controlled strings for HTML email bodies. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type OrderItemPayload = {
  name: string;
  size: string;
  quantity: number;
  price: number;
};

export type OrderConfirmationPayload = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  items: OrderItemPayload[];
  total: number;
  discount: number;
  promotionCode?: string;
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatMoney(n: number): string {
  return currency.format(n);
}

/** JOEY THE BRAND — same visual language as your Spill & Earn sample (card, gradient CTA block, footer). */
export function orderConfirmationHtml(order: OrderConfirmationPayload): string {
  const name = escapeHtml(order.customerName);
  const addr = escapeHtml(order.shippingAddress).replace(/\n/g, "<br>");
  const rows = order.items
    .map((it) => {
      const line = it.price * it.quantity;
      return `<tr>
        <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(it.name)}</td>
        <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${escapeHtml(it.size)}</td>
        <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${it.quantity}</td>
        <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatMoney(line)}</td>
      </tr>`;
    })
    .join("");

  const promo =
    order.promotionCode && order.discount > 0
      ? `<p style="margin:8px 0;color:#374151;font-size:14px;">Promotion <strong>${escapeHtml(order.promotionCode)}</strong> · −${formatMoney(order.discount)}</p>`
      : "";

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #f4f2ef;
      }
      .container {
        background: #ffffff;
        border-radius: 12px;
        padding: 40px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.08);
      }
      .header { text-align: center; margin-bottom: 28px; }
      .logo {
        font-size: 22px;
        font-weight: 700;
        letter-spacing: 0.06em;
        color: #272b36;
        margin-bottom: 8px;
      }
      .title {
        font-size: 22px;
        font-weight: 700;
        color: #1f2937;
        margin-bottom: 6px;
      }
      .accent-box {
        background: linear-gradient(135deg, #3d424d 0%, #917e71 100%);
        color: #ffffff;
        padding: 22px 24px;
        border-radius: 12px;
        text-align: center;
        margin: 24px 0;
      }
      .accent-label { font-size: 13px; opacity: 0.92; margin-bottom: 6px; }
      .accent-value { font-size: 20px; font-weight: 700; letter-spacing: 0.04em; }
      .content { margin: 24px 0; color: #374151; font-size: 15px; }
      table.items { width: 100%; border-collapse: collapse; font-size: 14px; }
      th { text-align: left; padding: 8px; color: #6b7280; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
      .footer {
        text-align: center;
        margin-top: 32px;
        padding-top: 20px;
        border-top: 1px solid #e5e7eb;
        color: #6b7280;
        font-size: 13px;
      }
      .note {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 14px 16px;
        margin: 18px 0;
        color: #4b5563;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">JOEY THE BRAND</div>
        <div class="title">Thank you for your order</div>
      </div>

      <div class="content">
        <p>Hi ${name},</p>
        <p>We’ve received your order and will send another update when it ships.</p>
      </div>

      <div class="accent-box">
        <div class="accent-label">Order number</div>
        <div class="accent-value">${escapeHtml(order.id)}</div>
        <div style="font-size:13px;opacity:0.88;margin-top:10px;">Total ${formatMoney(order.total)}</div>
      </div>

      ${promo}

      <div class="content">
        <p style="margin-bottom:8px;font-weight:600;color:#1f2937;">Items</p>
        <table class="items" role="presentation">
          <thead>
            <tr>
              <th>Product</th>
              <th style="text-align:center;">Size</th>
              <th style="text-align:center;">Qty</th>
              <th style="text-align:right;">Line</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <div class="note">
        <strong style="color:#272b36;">Ship to</strong><br>
        ${addr}<br><br>
        <strong style="color:#272b36;">Contact</strong><br>
        ${escapeHtml(order.customerEmail)} · ${escapeHtml(order.customerPhone)}
      </div>

      <div class="content">
        <p>If you didn’t place this order, reply to this email and we’ll help you.</p>
      </div>

      <div class="footer">
        <p>— JOEY THE BRAND</p>
        <p>Questions? We’re here to help.</p>
      </div>
    </div>
  </body>
</html>`;
}

export function orderConfirmationPlainText(order: OrderConfirmationPayload): string {
  const lines = [
    `JOEY THE BRAND — Order confirmation`,
    ``,
    `Order: ${order.id}`,
    `Total: ${formatMoney(order.total)}`,
    ``,
    `Items:`,
    ...order.items.map(
      (it) =>
        `  - ${it.name} (${it.size}) × ${it.quantity}  ${formatMoney(it.price * it.quantity)}`,
    ),
    ``,
    `Ship to:`,
    order.shippingAddress,
    ``,
    `${order.customerEmail} · ${order.customerPhone}`,
  ];
  return lines.join("\n");
}
