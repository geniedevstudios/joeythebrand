import type { Order, OrderStatus } from "./types";
import { isDhlShippingAddress } from "./formatShippingAddress";

type OrderShipment = Pick<Order, "shippingAddress" | "dhlTrackingNumber" | "dhlShipmentClaimedAt">;

const dhlPreparationStatuses = new Set<OrderStatus>([
  "pending", "paid_requires_resolution", "processing", "in production", "order packaged", "cancelled",
]);

export function isDhlOrder(order: OrderShipment) {
  return Boolean(order.dhlTrackingNumber) || isDhlShippingAddress(order.shippingAddress);
}

export function canSetManualOrderStatus(order: OrderShipment, status: OrderStatus) {
  if (status === "shipped" || status === "delivered") return false;
  if (!isDhlOrder(order)) return true;
  return !order.dhlTrackingNumber && !order.dhlShipmentClaimedAt && dhlPreparationStatuses.has(status);
}
