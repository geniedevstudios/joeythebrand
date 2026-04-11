"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { dataStore } from "@/lib/dataStore";
import type { Order, OrderItem, OrderStatus } from "@/lib/types";
import { PackageOpen } from "lucide-react";
import AdminStyledSelect from "@/components/AdminStyledSelect";
import OrderItemDetailModal from "@/components/OrderItemDetailModal";
import { formatOrderNumber } from "@/lib/formatOrderNumber";
import { formatOrderPlacedAt } from "@/lib/formatOrderPlacedAt";
import { toast } from "sonner";

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [itemModal, setItemModal] = useState<{ order: Order; item: OrderItem } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await dataStore.getOrders();
      setOrders(data);
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const unsubscribe = dataStore.subscribe(load);
    return unsubscribe;
  }, [load]);

  const handleStatusChange = async (id: string, newStatus: OrderStatus) => {
    setUpdatingId(id);
    try {
      await dataStore.updateOrderStatus(id, newStatus);
      await load();
      toast.success(`Order status updated to ${STATUS_OPTIONS.find((o) => o.value === newStatus)?.label ?? newStatus}.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update order status.";
      toast.error(msg);
      console.error("Failed to update order status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-neutral-600">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <OrderItemDetailModal
        open={itemModal !== null}
        onClose={() => setItemModal(null)}
        item={itemModal?.item ?? null}
        orderLabel={itemModal ? formatOrderNumber(itemModal.order) : ""}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Orders</h1>
        <span className="text-sm text-neutral-600">{orders.length} total</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          {orders.length === 0 ? (
            <div className="py-12 text-center">
              <PackageOpen className="mx-auto h-12 w-12 text-zinc-300" />
              <h3 className="mt-2 text-sm font-semibold text-zinc-900">No Orders Yet</h3>
              <p className="mt-1 text-sm text-neutral-600">Orders placed from the shop will appear here.</p>
            </div>
          ) : (
            <table className="min-w-[1080px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-100">
                  <th
                    scope="col"
                    className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900"
                  >
                    Order
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900"
                  >
                    Customer
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900"
                  >
                    Shipping
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900"
                  >
                    Products
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900"
                  >
                    Notes
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900"
                  >
                    Total
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900"
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {orders.map((order) => (
                  <tr key={order.id} className="align-top">
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="text-sm font-semibold tracking-tight text-zinc-900">
                        {formatOrderNumber(order)}
                      </div>
                      <div className="mt-1 text-xs text-neutral-600">
                        {formatOrderPlacedAt(order.createdAt)}
                      </div>
                    </td>
                    <td className="max-w-[200px] px-5 py-4">
                      <div className="text-sm font-medium text-zinc-900">{order.customerName}</div>
                      <div className="mt-0.5 text-xs text-zinc-600 break-all">{order.customerEmail}</div>
                      <div className="mt-1 text-xs text-neutral-600">{order.customerPhone}</div>
                      {order.userId && (
                        <div className="mt-1 text-xs font-medium text-blue-600">Linked account</div>
                      )}
                    </td>
                    <td className="max-w-[220px] px-5 py-4">
                      <div className="whitespace-normal text-xs leading-relaxed text-zinc-600">
                        {order.shippingAddress}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <ul className="flex max-w-xs flex-col gap-1.5">
                        {order.items.map((item, idx) => (
                          <li key={`${order.id}-${idx}-${item.productId}-${item.size}`}>
                            <button
                              type="button"
                              onClick={() => setItemModal({ order, item })}
                              className="flex w-full items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 p-2 text-left transition hover:border-zinc-200 hover:bg-gradient-to-b hover:from-stone-50 hover:to-zinc-50/90 hover:shadow-sm"
                              aria-label={`Details for ${item.name}, size ${item.size}, quantity ${item.quantity}`}
                            >
                              <span className="relative h-11 w-9 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 shadow-sm">
                                <img src={item.image} alt="" className="h-full w-full object-cover" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="line-clamp-2 text-sm font-medium text-zinc-900">
                                  {item.name}
                                </span>
                                <span className="mt-0.5 block text-xs text-neutral-600">
                                  Size{" "}
                                  <span className="font-semibold text-zinc-700">{item.size}</span>
                                  <span className="mx-1 text-zinc-300">·</span>
                                  Qty{" "}
                                  <span className="font-semibold text-zinc-700">{item.quantity}</span>
                                </span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="max-w-[180px] px-5 py-4">
                      <p className="text-xs leading-relaxed text-zinc-600 line-clamp-4">
                        {order.notes?.trim() ? order.notes : "—"}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="text-sm font-semibold text-zinc-900">
                        GHC {order.total.toLocaleString()}
                      </div>
                      {order.promotionCode ? (
                        <div className="mt-1 text-xs text-green-700">
                          {order.promotionCode} (−GHC {order.discount.toLocaleString()})
                        </div>
                      ) : null}
                    </td>
                    <td className="px-5 py-4">
                      <span id={`order-status-label-${order.id}`} className="sr-only">
                        Update order status
                      </span>
                      <AdminStyledSelect
                        name={`order-status-${order.id}`}
                        labelledBy={`order-status-label-${order.id}`}
                        defaultValue={order.status}
                        disabled={updatingId === order.id}
                        onValueChange={(v) => void handleStatusChange(order.id, v as OrderStatus)}
                        options={STATUS_OPTIONS}
                        wrapperClassName="min-w-[156px]"
                      />
                      {updatingId === order.id ? (
                        <p className="mt-1 text-xs text-zinc-400">Saving…</p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <p className="text-xs text-neutral-600">
        Tip: click a product row to see size, quantity, and line total.{" "}
        <Link href="/products" className="font-medium text-zinc-800 underline hover:text-zinc-950">
          Edit products
        </Link>
      </p>
    </div>
  );
}
