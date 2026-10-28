"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { dataStore } from "@/lib/dataStore";
import { supabase } from "@/lib/supabase";
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
  { value: "paid_requires_resolution", label: "Paid — Requires Resolution (Hold)" },
  { value: "processing", label: "Processing" },
  { value: "in production", label: "In Production (Made to Order)" },
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
  const [itemModal, setItemModal] = useState<{ order: Order; item: OrderItem; itemIndex: number } | null>(null);
  const [shipmentModal, setShipmentModal] = useState<{ orderId: string } | null>(null);
  const [dimensions, setDimensions] = useState({ length: 30, width: 20, height: 10 });

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
        orderId={itemModal?.order.id}
        itemIndex={itemModal?.itemIndex}
        orderLabel={itemModal ? formatOrderNumber(itemModal.order) : ""}
        onProductionStatusUpdated={load}
      />

      {shipmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-zinc-900">Enter Package Dimensions</h3>
            <p className="mb-4 text-sm text-zinc-600">Please measure the final packed box before generating the shipping label. Dimensions are in centimeters (cm).</p>
            <div className="mb-4 grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Length</label>
                <input type="number" value={dimensions.length} onChange={e => setDimensions({...dimensions, length: Number(e.target.value)})} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Width</label>
                <input type="number" value={dimensions.width} onChange={e => setDimensions({...dimensions, width: Number(e.target.value)})} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Height</label>
                <input type="number" value={dimensions.height} onChange={e => setDimensions({...dimensions, height: Number(e.target.value)})} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShipmentModal(null)} className="rounded-md px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100">Cancel</button>
              <button
                disabled={updatingId === shipmentModal.orderId}
                onClick={async () => {
                  try {
                    setUpdatingId(shipmentModal.orderId);
                    const res = await fetch("/api/dhl/create-shipment", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ""}` },
                      body: JSON.stringify({ orderId: shipmentModal.orderId, packageDimensions: dimensions })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Failed to create shipment");
                    toast.success(`Shipment created! Tracking: ${data.trackingNumber}`);
                    setShipmentModal(null);
                    await load();
                  } catch (err: any) {
                    toast.error(`Error: ${err.message}`);
                  } finally {
                    setUpdatingId(null);
                  }
                }}
                className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {updatingId === shipmentModal.orderId ? "Creating..." : "Generate Label"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                      {order.isMixedFulfillment ? (
                        <div className="mb-2 inline-flex items-center rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-semibold text-zinc-800 ring-1 ring-inset ring-zinc-600/20">
                          Combined Shipment (RTW + Made to Order)
                        </div>
                      ) : null}
                      {order.stockConflictFlagged || order.status === "paid_requires_resolution" ? (
                        <div className="mb-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-900">
                          <div className="font-bold">Stock Conflict Hold</div>
                          <p className="mt-0.5 text-[11px] text-red-800">
                            Late payment completed after reservation expiry. Physical stock was unavailable.
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <button type="button" disabled={updatingId === order.id} onClick={async () => {
                              const reason = window.prompt("Explain the stock conflict and proposed resolution:");
                              if (!reason?.trim()) return;
                              const agreement = window.prompt("Record the customer's agreement, including the affected items and accepted terms:");
                              if (!agreement?.trim()) return;
                              const days = Number(window.prompt("Accepted production time in calendar days (1–180):"));
                              if (!Number.isInteger(days) || days < 1 || days > 180) { toast.error("Enter a whole number of calendar days from 1 to 180."); return; }
                              setUpdatingId(order.id);
                              try { await dataStore.resolveOrderStockConflict(order.id, reason, agreement, days); await load(); toast.success("Conflicting items converted to Made to Order."); }
                              catch (err: any) { toast.error(err.message || "Could not resolve hold."); }
                              finally { setUpdatingId(null); }
                            }} className="rounded bg-zinc-800 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50">
                              Record customer agreement and convert affected items
                            </button>
                          </div>
                        </div>
                      ) : null}
                      <ul className="flex max-w-xs flex-col gap-1.5">
                        {order.items.map((item, idx) => {
                          const isMto =
                            item.fulfillmentType === "made_to_order" ||
                            Boolean(item.isMadeToOrder) ||
                            Boolean(item.isBespoke);
                          const leadDays = item.leadDays ?? item.bespokeLeadDays ?? 14;
                          return (
                          <li key={`${order.id}-${idx}-${item.productId}-${item.size}`}>
                            <button
                              type="button"
                              onClick={() => setItemModal({ order, item, itemIndex: idx })}
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
                                {isMto ? (
                                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                                    <span className="inline-flex rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-800">
                                      Made to Order · {leadDays}d
                                    </span>
                                    {item.estimatedReadyDate ? (
                                      <span className="text-[10px] text-zinc-600">
                                        Ready: {item.estimatedReadyDate}
                                      </span>
                                    ) : null}
                                    {item.productionStatus && item.productionStatus !== "not_applicable" ? (
                                      <span className="inline-flex rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium capitalize text-zinc-800">
                                        {item.productionStatus.replace(/_/g, " ")}
                                      </span>
                                    ) : null}
                                  </span>
                                ) : null}
                              </span>
                            </button>
                          </li>
                          );
                        })}
                      </ul>
                    </td>
                    <td className="max-w-[180px] px-5 py-4">
                      <p className="text-xs leading-relaxed text-zinc-600 whitespace-pre-wrap">
                        {order.notes?.trim() ? order.notes : "—"}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="text-sm font-semibold text-zinc-900">
                        GHC {order.total.toLocaleString()}
                      </div>
                      <div className="mt-1">
                        {order.paymentStatus === "unpaid" ? (
                          <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                            Unpaid
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                            Paid
                          </span>
                        )}
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
                        disabled={updatingId === order.id || order.stockConflictFlagged}
                        onValueChange={(v) => void handleStatusChange(order.id, v as OrderStatus)}
                        options={STATUS_OPTIONS}
                        wrapperClassName="min-w-[156px]"
                      />
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
                                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ""}` },
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
                      ) : order.shippingAddress?.includes("DHL[") ? (
                        <div className="mt-3 border-t border-zinc-100 pt-2">
                          <button
                            type="button"
                            disabled={updatingId === order.id || order.stockConflictFlagged || order.status !== "order packaged"}
                            onClick={() => setShipmentModal({ orderId: order.id })}
                            className="text-white bg-black hover:bg-zinc-800 px-2 py-1.5 rounded w-full text-xs font-medium transition-colors disabled:opacity-50"
                          >
                            Create DHL Shipment
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
