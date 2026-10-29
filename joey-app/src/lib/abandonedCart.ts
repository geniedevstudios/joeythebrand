import * as React from "react";
import AbandonedCartEmail from "../emails/AbandonedCartEmail";
import { getEmailBaseUrl } from "./emailAssets";
import { DEFAULT_ORDERS_SENDER } from "./orderWorkflow";
import type { OrderEmailSender } from "./orderWorkflow";

const DEFAULT_IDLE_MINUTES = 60;

type CartRow = {
  id: string;
  user_id: string;
  items: unknown;
  updated_at: string;
  abandoned_email_sent_at: string | null;
};

type CartLine = {
  name?: string;
  quantity?: number;
  price?: number;
  size?: string;
  fit?: string;
  color?: string;
  image?: string;
  isMadeToOrder?: boolean;
  isBespoke?: boolean;
  leadDays?: number;
};

function idleCutoffIso(idleMinutes: number): string {
  return new Date(Date.now() - idleMinutes * 60 * 1000).toISOString();
}

function parseItems(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((row) => row && typeof row === "object") as CartLine[];
}

function getIdleMinutes(): number {
  const fromEnv = Number(process.env.ABANDONED_CART_IDLE_MINUTES);
  if (Number.isFinite(fromEnv) && fromEnv >= 5) return fromEnv;
  return DEFAULT_IDLE_MINUTES;
}


export async function processAbandonedCartReminders(params: {
  supabaseAdmin: {
    from: (table: string) => any;
    auth: { admin: { getUserById: (id: string) => Promise<any> } };
  };
  emailSender: OrderEmailSender;
  limit?: number;
  idleMinutes?: number;
}): Promise<{ scanned: number; sent: number; skipped: number; failed: number }> {
  const idleMinutes = params.idleMinutes ?? getIdleMinutes();
  const limit = params.limit ?? 25;
  const cutoff = idleCutoffIso(idleMinutes);
  const fromEmail = process.env.ORDERS_FROM_EMAIL?.trim() || DEFAULT_ORDERS_SENDER;
  const cartUrl = `${getEmailBaseUrl()}/cart`;

  const { data: rows, error } = await params.supabaseAdmin
    .from("carts")
    .select("id, user_id, items, updated_at, abandoned_email_sent_at")
    .is("abandoned_email_sent_at", null)
    .lt("updated_at", cutoff)
    .order("updated_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message || "Failed to load abandoned carts");
  }

  const carts = (rows || []) as CartRow[];
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const cart of carts) {
    const items = parseItems(cart.items).filter(
      (item) => String(item.name || "").trim() && Number(item.quantity || 0) > 0,
    );
    if (items.length === 0) {
      skipped += 1;
      continue;
    }

    const { data: laterOrder } = await params.supabaseAdmin
      .from("orders")
      .select("id")
      .eq("user_id", cart.user_id)
      .gte("created_at", cart.updated_at)
      .limit(1)
      .maybeSingle();

    if (laterOrder?.id) {
      skipped += 1;
      continue;
    }

    const { data: userRes, error: userErr } = await params.supabaseAdmin.auth.admin.getUserById(
      cart.user_id,
    );
    const email = userRes?.user?.email?.trim();
    if (userErr || !email) {
      skipped += 1;
      continue;
    }

    const customerName =
      (userRes.user.user_metadata?.full_name as string) ||
      email.split("@")[0] ||
      "there";

    const { data: claimed, error: claimErr } = await params.supabaseAdmin
      .from("carts")
      .update({ abandoned_email_sent_at: new Date().toISOString() })
      .eq("id", cart.id)
      .is("abandoned_email_sent_at", null)
      .select("id")
      .maybeSingle();

    if (claimErr || !claimed?.id) {
      skipped += 1;
      continue;
    }

    try {
      const sendRes = await params.emailSender.send(
        {
          from: `JOEY The brand <${fromEmail}>`,
          to: email,
          subject: `${customerName.split(" ")[0]}, your cart is still waiting`,
          react: React.createElement(AbandonedCartEmail, {
            customerName,
            items: items.map((item) => ({
              name: String(item.name),
              quantity: Number(item.quantity || 1),
              price: Number(item.price || 0),
              size: item.size,
              fit: item.fit,
              color: item.color,
              image: item.image,
              isMadeToOrder: item.isMadeToOrder,
              isBespoke: item.isBespoke,
              leadDays: item.leadDays,
            })),
            cartUrl,
          }),
          headers: {
            "X-Entity-Ref-ID": `joey-abandoned-cart-${cart.id}`,
          },
        },
        { idempotencyKey: `joey-abandoned-cart-${cart.id}` },
      );

      if (sendRes?.error) {
        throw new Error(sendRes.error.message || "Resend API error");
      }
      sent += 1;
    } catch {
      await params.supabaseAdmin
        .from("carts")
        .update({ abandoned_email_sent_at: null })
        .eq("id", cart.id);
      failed += 1;
    }
  }

  return { scanned: carts.length, sent, skipped, failed };
}
