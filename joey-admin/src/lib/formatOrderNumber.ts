import type { Order } from "@/lib/types";

/** Friendly JY-000042 for support; truncated UUID if legacy row. */
export function formatOrderNumber(order: Pick<Order, "id" | "orderNumber">): string {
  const n = order.orderNumber?.trim();
  if (n) return n;
  return `${order.id.slice(0, 8)}…`;
}
