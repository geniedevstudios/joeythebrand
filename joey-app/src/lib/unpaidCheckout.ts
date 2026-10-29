import * as React from "react";
import { Resend } from "resend";
import UnpaidCheckoutEmail from "../emails/UnpaidCheckoutEmail";
import { getEmailBaseUrl } from "./emailAssets";
import {
  DEFAULT_ORDERS_SENDER,
  getAdminOrdersUrl,
  getOrdersAdminEmail,
} from "./orderWorkflow";

export const DEFAULT_UNPAID_IDLE_MINUTES = 15;

type NudgeIds = {
  customerEmailId?: string;
  adminEmailId?: string;
};

type OrderRow = {
  id: string;
  order_number?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  items: unknown;
  total?: number;
  payment_status?: string | null;
  unpaid_nudge_sent_at?: string | null;
  unpaid_nudge_resend_ids?: NudgeIds | null;
  user_id?: string | null;
};

type CartLine = {
  name?: string;
  quantity?: number;
  price?: number;
  size?: string;
  color?: string;
  image?: string;
};

function getIdleMinutes(): number {
  const fromEnv = Number(process.env.UNPAID_CHECKOUT_IDLE_MINUTES);
  if (Number.isFinite(fromEnv) && fromEnv >= 5) return fromEnv;
  return DEFAULT_UNPAID_IDLE_MINUTES;
}

function parseItems(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((row) => row && typeof row === "object") as CartLine[];
}

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

function fromAddress(): string {
  return `JOEY The brand <${process.env.ORDERS_FROM_EMAIL?.trim() || DEFAULT_ORDERS_SENDER}>`;
}

function scheduledAtIso(idleMinutes: number): string {
  return new Date(Date.now() + idleMinutes * 60 * 1000).toISOString();
}

async function sendPair(params: {
  resend: Resend;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  orderNumber?: string;
  items: CartLine[];
  total?: number;
  scheduledAt?: string;
  idempotencyPrefix: string;
}): Promise<NudgeIds> {
  const checkoutUrl = `${getEmailBaseUrl()}/checkout`;
  const adminOrdersUrl = getAdminOrdersUrl();
  const adminTo = getOrdersAdminEmail();
  const firstName = params.customerName.split(" ")[0] || "there";
  const mapped = params.items.map((item) => ({
    name: String(item.name || "Item"),
    quantity: Number(item.quantity || 1),
    price: Number(item.price || 0),
    size: item.size,
    color: item.color,
    image: item.image,
  }));

  const customer = await params.resend.emails.send(
    {
      from: fromAddress(),
      to: params.customerEmail,
      subject: `${firstName}, did something go wrong at checkout?`,
      react: React.createElement(UnpaidCheckoutEmail, {
        customerName: params.customerName,
        orderNumber: params.orderNumber,
        items: mapped,
        total: params.total,
        checkoutUrl,
      }),
      headers: { "X-Entity-Ref-ID": `${params.idempotencyPrefix}-customer` },
      ...(params.scheduledAt ? { scheduledAt: params.scheduledAt } : {}),
    } as Parameters<Resend["emails"]["send"]>[0],
    { idempotencyKey: `${params.idempotencyPrefix}-customer` },
  );

  const admin = await params.resend.emails.send(
    {
      from: fromAddress(),
      to: adminTo,
      subject: `Unpaid checkout — ${params.customerName}${
        params.orderNumber ? ` — ${params.orderNumber}` : ""
      }`,
      react: React.createElement(UnpaidCheckoutEmail, {
        isAdmin: true,
        customerName: params.customerName,
        customerEmail: params.customerEmail,
        customerPhone: params.customerPhone,
        orderNumber: params.orderNumber,
        items: mapped,
        total: params.total,
        adminOrdersUrl,
      }),
      headers: { "X-Entity-Ref-ID": `${params.idempotencyPrefix}-admin` },
      ...(params.scheduledAt ? { scheduledAt: params.scheduledAt } : {}),
    } as Parameters<Resend["emails"]["send"]>[0],
    { idempotencyKey: `${params.idempotencyPrefix}-admin` },
  );

  if (customer.error) throw new Error(customer.error.message || "Customer unpaid email failed");
  if (admin.error) throw new Error(admin.error.message || "Admin unpaid email failed");

  return {
    customerEmailId: customer.data?.id,
    adminEmailId: admin.data?.id,
  };
}

export async function cancelScheduledNudgeIds(ids: NudgeIds | null | undefined): Promise<void> {
  const resend = getResend();
  if (!resend || !ids) return;
  for (const id of [ids.customerEmailId, ids.adminEmailId]) {
    if (!id) continue;
    try {
      await (resend.emails as { cancel: (emailId: string) => Promise<unknown> }).cancel(id);
    } catch {
      /* already sent or not cancellable */
    }
  }
}

export async function scheduleUnpaidOrderReminder(params: {
  supabaseAdmin: { from: (table: string) => any };
  order: OrderRow;
}): Promise<void> {
  if (
    params.order.unpaid_nudge_sent_at ||
    String(params.order.payment_status || "").toLowerCase() === "paid"
  ) {
    return;
  }
  const resend = getResend();
  if (!resend) return;

  const items = parseItems(params.order.items);
  const ids = await sendPair({
    resend,
    customerName: params.order.customer_name,
    customerEmail: params.order.customer_email,
    customerPhone: params.order.customer_phone,
    orderNumber: params.order.order_number || undefined,
    items,
    total: Number(params.order.total || 0),
    scheduledAt: scheduledAtIso(getIdleMinutes()),
    idempotencyPrefix: `joey-unpaid-order-${params.order.id}`,
  });

  await params.supabaseAdmin
    .from("orders")
    .update({
      unpaid_nudge_sent_at: new Date().toISOString(),
      unpaid_nudge_resend_ids: ids,
    })
    .eq("id", params.order.id)
    .is("unpaid_nudge_sent_at", null);
}

export async function cancelUnpaidOrderReminder(params: {
  supabaseAdmin: { from: (table: string) => any };
  orderId: string;
}): Promise<void> {
  const { data } = await params.supabaseAdmin
    .from("orders")
    .select("unpaid_nudge_resend_ids, user_id")
    .eq("id", params.orderId)
    .maybeSingle();
  await cancelScheduledNudgeIds(data?.unpaid_nudge_resend_ids as NudgeIds | undefined);

  if (data?.user_id) {
    const { data: cart } = await params.supabaseAdmin
      .from("carts")
      .select("id, checkout_nudge_resend_ids")
      .eq("user_id", data.user_id)
      .maybeSingle();
    if (cart?.id) {
      await cancelScheduledNudgeIds(cart.checkout_nudge_resend_ids as NudgeIds | undefined);
      await params.supabaseAdmin
        .from("carts")
        .update({ checkout_nudge_sent_at: new Date().toISOString() })
        .eq("id", cart.id);
    }
  }
}

export async function markCheckoutStarted(params: {
  supabaseAdmin: { from: (table: string) => any; auth: { admin: { getUserById: (id: string) => Promise<any> } } };
  userId: string;
  items: CartLine[];
}): Promise<void> {
  const { data: cart } = await params.supabaseAdmin
    .from("carts")
    .select("id, checkout_started_at, checkout_nudge_sent_at, checkout_nudge_resend_ids, items")
    .eq("user_id", params.userId)
    .maybeSingle();

  if (!cart?.id) return;
  if (cart.checkout_nudge_sent_at || cart.checkout_nudge_resend_ids) {
    if (!cart.checkout_started_at) {
      await params.supabaseAdmin
        .from("carts")
        .update({ checkout_started_at: new Date().toISOString() })
        .eq("id", cart.id);
    }
    return;
  }

  const { data: unpaid } = await params.supabaseAdmin
    .from("orders")
    .select("id")
    .eq("user_id", params.userId)
    .neq("payment_status", "paid")
    .limit(1)
    .maybeSingle();
  if (unpaid?.id) {
    await params.supabaseAdmin
      .from("carts")
      .update({ checkout_started_at: new Date().toISOString() })
      .eq("id", cart.id);
    return;
  }

  const resend = getResend();
  const { data: userRes } = await params.supabaseAdmin.auth.admin.getUserById(params.userId);
  const email = userRes?.user?.email?.trim();
  const name =
    (userRes?.user?.user_metadata?.full_name as string) ||
    email?.split("@")[0] ||
    "there";
  if (!resend || !email) {
    await params.supabaseAdmin
      .from("carts")
      .update({ checkout_started_at: new Date().toISOString() })
      .eq("id", cart.id);
    return;
  }

  const lines = parseItems(params.items.length ? params.items : cart.items);
  const ids = await sendPair({
    resend,
    customerName: name,
    customerEmail: email,
    items: lines,
    scheduledAt: scheduledAtIso(getIdleMinutes()),
    idempotencyPrefix: `joey-unpaid-checkout-${cart.id}`,
  });

  await params.supabaseAdmin
    .from("carts")
    .update({
      checkout_started_at: new Date().toISOString(),
      checkout_nudge_sent_at: new Date().toISOString(),
      checkout_nudge_resend_ids: ids,
    })
    .eq("id", cart.id)
    .is("checkout_nudge_sent_at", null);
}

export async function processUnpaidOrderReminders(params: {
  supabaseAdmin: { from: (table: string) => any };
  limit?: number;
}): Promise<{ scanned: number; sent: number; skipped: number; failed: number }> {
  const idleMinutes = getIdleMinutes();
  const cutoff = new Date(Date.now() - idleMinutes * 60 * 1000).toISOString();
  const { data: rows, error } = await params.supabaseAdmin
    .from("orders")
    .select(
      "id, order_number, customer_name, customer_email, customer_phone, items, total, payment_status, unpaid_nudge_sent_at",
    )
    .is("unpaid_nudge_sent_at", null)
    .neq("payment_status", "paid")
    .lt("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(params.limit ?? 25);

  if (error) throw new Error(error.message || "Failed to load unpaid orders");

  const orders = (rows || []) as OrderRow[];
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const resend = getResend();

  for (const order of orders) {
    if (!order.customer_email?.trim()) {
      skipped += 1;
      continue;
    }
    const { data: claimed } = await params.supabaseAdmin
      .from("orders")
      .update({ unpaid_nudge_sent_at: new Date().toISOString() })
      .eq("id", order.id)
      .is("unpaid_nudge_sent_at", null)
      .select("id")
      .maybeSingle();
    if (!claimed?.id) {
      skipped += 1;
      continue;
    }
    if (!resend) {
      skipped += 1;
      continue;
    }
    try {
      const ids = await sendPair({
        resend,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone,
        orderNumber: order.order_number || undefined,
        items: parseItems(order.items),
        total: Number(order.total || 0),
        idempotencyPrefix: `joey-unpaid-order-${order.id}`,
      });
      await params.supabaseAdmin
        .from("orders")
        .update({ unpaid_nudge_resend_ids: ids })
        .eq("id", order.id);
      sent += 1;
    } catch {
      await params.supabaseAdmin
        .from("orders")
        .update({ unpaid_nudge_sent_at: null })
        .eq("id", order.id);
      failed += 1;
    }
  }

  return { scanned: orders.length, sent, skipped, failed };
}
