import type { ShippingDisplay } from "@/lib/formatShippingAddress";
import type { Order, OrderItem, OrderStatus } from "@/lib/types";
import { canSetManualOrderStatus } from "@/lib/orderStatusRules";

export const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "paid_requires_resolution", label: "Stock conflict hold" },
  { value: "processing", label: "Processing" },
  { value: "in production", label: "In production" },
  { value: "order packaged", label: "Order packaged" },
  { value: "courier on his way to pick package", label: "Courier en route to collect" },
  { value: "courier picked package", label: "Collected by courier" },
  { value: "courier on the way to deliver package", label: "Out for delivery" },
  { value: "package delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export function statusLabel(status: OrderStatus) {
  if (status === "shipped") return "Shipped";
  if (status === "delivered") return "Delivered";
  return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export function isMadeToOrder(item: OrderItem) {
  return item.fulfillmentType === "made_to_order" || Boolean(item.isMadeToOrder || item.isBespoke);
}

export function fulfilmentLabel(order: Order) {
  const madeToOrder = order.hasMadeToOrderItems || order.items.some(isMadeToOrder);
  if (order.isMixedFulfillment || (madeToOrder && order.items.some((item) => !isMadeToOrder(item)))) {
    return "Mixed fulfilment";
  }
  return madeToOrder ? "Made to Order" : "Ready to Wear";
}

export function orderProgressLabel(order: Order) {
  return order.dhlTrackingNumber && order.status !== "cancelled"
    ? statusLabel("order packaged")
    : statusLabel(order.status);
}

export function statusOptionsForOrder(order: Order) {
  const readyToWear = fulfilmentLabel(order) === "Ready to Wear";
  return STATUS_OPTIONS.filter((option) =>
    canSetManualOrderStatus(order, option.value) &&
    (!readyToWear || option.value !== "in production" || option.value === order.status),
  );
}

const amountFormat = new Intl.NumberFormat("en-GH", { maximumFractionDigits: 2 });

export function money(amount: number) {
  return `GHS ${amountFormat.format(amount)}`;
}

export function customerOrderNote(notes: string | undefined, shipping: ShippingDisplay) {
  const note = notes?.trim() ?? "";
  const method = shipping.carrier === "dhl"
    ? `DHL Express ${shipping.international ? "Worldwide" : "Domestic"}`
    : shipping.carrier === "custom" && shipping.international ? "Custom Sales Contact" : "";
  if (!method) return note;

  // Older checkouts appended the shipping selection after a blank line.
  const footer = `Selected Shipping: ${method}`;
  if (note === footer) return "";
  const suffix = `\n\n${footer}`;
  return note.endsWith(suffix) ? note.slice(0, -suffix.length).trimEnd() : note;
}
