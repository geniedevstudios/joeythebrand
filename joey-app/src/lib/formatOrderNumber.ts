import type { Order } from "@/lib/types";

/** Public / admin display: friendly JY-000042, or truncated UUID before migration. */
export function formatOrderNumber(order: Pick<Order, "id" | "orderNumber">): string {
  const n = order.orderNumber?.trim();
  if (n) return n;
  return `${order.id.slice(0, 8)}…`;
}
