import type { Order, OrderStatus } from "./types";

export const CUSTOMER_ORDER_COLUMNS = [
  "id", "order_number", "customer_name", "customer_email", "customer_phone",
  "shipping_address", "items", "subtotal", "shipping_cost", "total", "discount",
  "promotion_code", "payment_status", "payment_ref", "status", "user_id", "notes",
  "reservation_expires_at", "paid_at", "stock_conflict_flagged", "stock_conflict_details",
  "has_made_to_order_items", "is_mixed_fulfillment", "max_lead_days", "dhl_tracking_number",
  "has_label", "dhl_status", "created_at", "updated_at",
].join(",");

export const mapOrder = (row: Record<string, unknown>): Order => ({
  id: row.id as string,
  orderNumber: String(row.order_number ?? "").trim() || undefined,
  customerName: row.customer_name as string,
  customerEmail: row.customer_email as string,
  customerPhone: row.customer_phone as string,
  shippingAddress: row.shipping_address as string,
  items: row.items as Order["items"],
  subtotal: row.subtotal != null ? Number(row.subtotal) : undefined,
  shippingCost: row.shipping_cost != null ? Number(row.shipping_cost) : undefined,
  total: Number(row.total),
  discount: Number(row.discount),
  promotionCode: row.promotion_code as string | undefined,
  paymentStatus: (row.payment_status as "unpaid" | "paid") || "unpaid",
  paymentRef: (row.payment_ref as string) || undefined,
  status: row.status as OrderStatus,
  userId: row.user_id as string | undefined,
  notes: row.notes as string | undefined,
  reservationExpiresAt: (row.reservation_expires_at as string) || undefined,
  paidAt: (row.paid_at as string) || undefined,
  stockConflictFlagged: Boolean(row.stock_conflict_flagged),
  stockConflictDetails: row.stock_conflict_details ?? undefined,
  hasMadeToOrderItems: Boolean(row.has_made_to_order_items),
  isMixedFulfillment: Boolean(row.is_mixed_fulfillment),
  maxLeadDays: row.max_lead_days != null ? Number(row.max_lead_days) : undefined,
  dhlTrackingNumber: row.dhl_tracking_number as string | undefined,
  hasLabel: row.has_label === true || (typeof row.dhl_label_url === "string" && row.dhl_label_url.length > 0),
  dhlStatus: row.dhl_status as string | undefined,
  statusHistory: (typeof row.dhl_status === "string" && row.dhl_status.startsWith("["))
    ? JSON.parse(row.dhl_status)
    : [],
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
});
