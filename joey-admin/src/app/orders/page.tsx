"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { dataStore } from "@/lib/dataStore";
import type { Order, OrderItem, OrderStatus } from "@/lib/types";
import { PackageOpen } from "lucide-react";
import AdminStyledSelect from "@/components/AdminStyledSelect";
import { isVideoUrl } from "@/lib/isVideoUrl";
import OrderItemDetailModal from "@/components/OrderItemDetailModal";
import { formatOrderNumber } from "@/lib/formatOrderNumber";
import { formatOrderPlacedAt } from "@/lib/formatOrderPlacedAt";
import { formatSizeLabel } from "@/lib/formatSizeLabel";
import { toast } from "sonner";

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "order packaged", label: "Order Packaged" },
  { value: "courier on his way to pick package", label: "Courier On His Way To Pick Package" },
  { value: "courier picked package", label: "Courier Picked Package" },
  { value: "courier on the way to deliver package", label: "Courier On The Way To Deliver Package" },
  { value: "package delivered", label: "Package Delivered" },
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
      <div className="flex min-h-full w-full items-center justify-center">
        <div className="text-sm text-zinc-900">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full w-full min-w-0 max-w-none flex-col gap-6 overflow-x-hidden">
      <OrderItemDetailModal
        open={itemModal !== null}
        onClose={() => setItemModal(null)}
        item={itemModal?.item ?? null}
        orderLabel={itemModal ? formatOrderNumber(itemModal.order) : ""}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Orders</h1>
        <span className="text-sm text-zinc-800">{orders.length} total</span>
      </div>

      <div className="flex-1 min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="h-full min-w-0 overflow-x-auto overscroll-x-contain">
          {orders.length === 0 ? (
            <div className="flex h-full min-h-[16rem] flex-col items-center justify-center py-12 text-center">
              <PackageOpen className="mx-auto h-12 w-12 text-zinc-300" />
              <h3 className="mt-2 text-sm font-semibold text-zinc-900">No Orders Yet</h3>
              <p className="mt-1 text-sm text-zinc-800">Orders placed from the shop will appear here.</p>
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
                      <div className="mt-1 text-xs text-zinc-800">
                        {formatOrderPlacedAt(order.createdAt)}
                      </div>
                    </td>
                    <td className="max-w-[200px] px-5 py-4">
                      <div className="text-sm font-medium text-zinc-900">{order.customerName}</div>
                      <div className="mt-0.5 text-xs text-zinc-600 break-all">{order.customerEmail}</div>
                      <div className="mt-1 text-xs text-zinc-800">{order.customerPhone}</div>
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
                              className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-2 text-left transition hover:border-white/15 hover:bg-white/[0.06] hover:shadow-[0_18px_70px_rgba(0,0,0,0.35)]"
                              aria-label={`Details for ${item.name}, size ${item.size}, quantity ${item.quantity}`}
                            >
                              <span className="relative h-11 w-9 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 shadow-sm">
                                {isVideoUrl(item.image) ? (
                                  <video
                                    src={item.image}
                                    className="h-full w-full object-cover"
                                    muted
                                    playsInline
                                    loop
                                    autoPlay
                                    preload="metadata"
                                    aria-hidden
                                  />
                                ) : (
                                  <img src={item.image} alt="" className="h-full w-full object-cover" />
                                )}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="line-clamp-2 text-sm font-medium text-zinc-900">
                                  {item.name}
                                </span>
                                {(item.color || item.combo) && (
                                  <span className="mt-0.5 block text-xs text-zinc-600">
                                    {(item.color || item.colorHex) && (
                                      <span className="mr-3 inline-flex items-center gap-1.5 capitalize">
                                        Color: {item.colorHex ? <span style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: item.colorHex || "#ccc", backgroundImage: item.image ? `url(${item.image})` : "none", backgroundSize: "cover", backgroundPosition: "center", border: "1px solid #ccc", display: "inline-block" }} title={item.color} /> : item.color}
                                      </span>
                                    )}
                                    {item.combo && <span className="capitalize">Combo: {item.combo}</span>}
                                  </span>
                                )}
                                <span className="mt-0.5 block text-xs text-zinc-800">
                                  Size{" "}
                                  <span className="font-semibold text-zinc-700">{formatSizeLabel(item.size, item.fit, item.wearTag)}</span>
                                  {item.fit && (
                                    <>
                                      <span className="mx-1 text-zinc-300">·</span>
                                      <span className="font-semibold text-zinc-700">{item.fit} Fit</span>
                                    </>
                                  )}
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
                      {order.shippingAddress.includes("(international)") ? (
                        <div className="text-sm font-medium text-zinc-700 bg-zinc-100 px-3 py-2 rounded-md inline-block w-full text-center">
                          Managed by DHL
                        </div>
                      ) : (
                        <AdminStyledSelect
                          name={`order-status-${order.id}`}
                          labelledBy={`order-status-label-${order.id}`}
                          defaultValue={order.status}
                          disabled={updatingId === order.id}
                          onValueChange={(v) => void handleStatusChange(order.id, v as OrderStatus)}
                          options={STATUS_OPTIONS}
                          wrapperClassName="min-w-[156px]"
                        />
                      )}
                      {order.dhlTrackingNumber ? (
                        <div className="mt-3 text-xs border-t border-zinc-100 pt-2">
                          <p className="font-medium text-zinc-900 mb-1">DHL Ship</p>
                          {order.dhlStatus?.startsWith("Pickup Scheduled") && (
                            <a 
                              href={order.dhlLabelUrl?.startsWith("data:") ? order.dhlLabelUrl : `data:application/pdf;base64,${order.dhlLabelUrl}`} 
                              download={`DHL_Label_${order.dhlTrackingNumber}.pdf`} 
                              className="text-blue-600 hover:underline block mb-1"
                            >
                              Download Label
                            </a>
                          )}
                          {!order.dhlStatus?.startsWith("Pickup Scheduled") && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  setUpdatingId(order.id);
                                  const res = await fetch("/api/dhl/schedule-pickup", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ orderId: order.id, trackingNumber: order.dhlTrackingNumber })
                                  });
                                  const data = await res.json();
                                  if (!res.ok) throw new Error(data.error || "Failed");
                                  toast.success(`Pickup scheduled! Confirmation: ${data.dispatchConfirmationNumber}`);
                                  await load();
                                } catch (err: any) {
                                  toast.error(`Error: ${err.message}`);
                                } finally {
                                  setUpdatingId(null);
                                }
                              }}
                              className="text-white bg-black hover:bg-zinc-800 px-2 py-1 rounded w-full mt-1 transition-colors"
                            >
                              Schedule Pickup
                            </button>
                          )}
                          <p className="mt-1 text-[10px] text-zinc-500">{order.dhlStatus}</p>
                        </div>
                      ) : order.shippingAddress?.includes("(international)") ? (
                        <div className="mt-3 border-t border-zinc-100 pt-2">
                          <button
                            type="button"
                            disabled={updatingId === order.id}
                            onClick={async () => {
                              try {
                                setUpdatingId(order.id);
                                const res = await fetch("/api/dhl/create-shipment", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ orderId: order.id })
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error || "Failed to create shipment");
                                toast.success(`Shipment created! Tracking: ${data.trackingNumber}`);
                                await load();
                              } catch (err: any) {
                                toast.error(`Error: ${err.message}`);
                              } finally {
                                setUpdatingId(null);
                              }
                            }}
                            className="text-white bg-black hover:bg-zinc-800 px-2 py-1.5 rounded w-full text-xs font-medium transition-colors disabled:opacity-50"
                          >
                            {updatingId === order.id ? "Creating..." : "Create DHL Shipment"}
                          </button>
                        </div>
                      ) : null}

                      {updatingId === order.id ? (
                        <p className="mt-1 text-xs text-zinc-700">Saving…</p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <p className="text-xs text-zinc-800">
        Tip: click a product row to see size, quantity, and line total.{" "}
        <Link href="/products" className="font-medium text-zinc-800 underline hover:text-zinc-950">
          Edit products
        </Link>
      </p>
    </div>
  );
}
