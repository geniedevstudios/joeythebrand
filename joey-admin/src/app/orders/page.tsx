"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronRight, PackageOpen } from "lucide-react";
import { dataStore } from "@/lib/dataStore";
import { supabase } from "@/lib/supabase";
import type { ItemProductionStatus, Order, OrderStatus } from "@/lib/types";
import type { DhlCustomsLine } from "@/lib/dhl";
import { DHL_CUSTOMS_DESCRIPTION_MAX, DHL_CUSTOMS_DESCRIPTION_MIN, DHL_REQUIRE_INBOUND_HS, DHL_SHIPMENT_DESCRIPTION_MAX } from "@/lib/dhlRules";
import { allocateCartonWeight, hasUnconfirmedQuantityWeights, shipmentWeightTotals } from "@/lib/dhlWeights";
import { isDhlParcel, type DhlParcel } from "@/lib/dhlParcel";
import { formatOrderNumber } from "@/lib/formatOrderNumber";
import { formatOrderPlacedAt } from "@/lib/formatOrderPlacedAt";
import OrderDetailsDialog, { PaymentBadge } from "./OrderDetailsDialog";
import OrderThumbnail from "./OrderThumbnail";
import { fulfilmentLabel, money, orderProgressLabel, statusLabel } from "./orderDisplay";

const MEASUREMENTS = ["length", "width", "height"] as const;
const blankParcel = (): DhlParcel => ({ weight: 0, dimensions: { length: 0, width: 0, height: 0 } });
const field = "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-sm";

type ParcelForm = {
  orderId: string;
  trackingNumber?: string;
  customsLines: (DhlCustomsLine & { confirmed?: boolean })[];
  itemDescription: string;
  countryCode?: string;
  paidFreight?: number;
  freightReviewEnabled?: boolean;
};

type Notice = { orderId: string; text: string; error?: boolean };

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [parcelForm, setParcelForm] = useState<ParcelForm | null>(null);
  const [parcel, setParcel] = useState(blankParcel);
  const [freightReview, setFreightReview] = useState<{ parcel: DhlParcel; paid: number; current: number | null; confirmed: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await dataStore.getOrders();
      setOrders(data);
      setLoadError(false);
    } catch (error) {
      console.error("Failed to load orders:", error);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return dataStore.subscribe(load);
  }, [load]);

  const selectedOrder = orders.find((order) => order.id === selectedId);
  const activeParcelForm = parcelForm && parcelForm.orderId === selectedOrder?.id &&
    (parcelForm.trackingNumber
      ? !selectedOrder.dhlPickupClaimedAt && !selectedOrder.dhlPickupConfirmation
      : !selectedOrder.dhlShipmentClaimedAt && !selectedOrder.dhlTrackingNumber)
    ? parcelForm
    : null;

  function selectOrder(orderId: string) {
    setSelectedId(orderId);
    setNotice(null);
    setParcelForm(null);
  }

  async function updateOrder(orderId: string, action: () => Promise<string | void>) {
    setWorkingId(orderId);
    setNotice(null);
    try {
      const message = await action();
      if (message) {
        setNotice({ orderId, text: message });
        await load();
      }
    } catch (error) {
      setNotice({ orderId, text: error instanceof Error ? error.message : "Could not update the order.", error: true });
      await load();
    } finally {
      setWorkingId(null);
    }
  }

  async function openShipment(orderId: string) {
    await updateOrder(orderId, async () => {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`/api/dhl/create-shipment?orderId=${encodeURIComponent(orderId)}`, {
        headers: { Authorization: `Bearer ${token || ""}` },
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load shipment details.");
      setParcel(blankParcel());
      setFreightReview(null);
      if (data.frozen) throw new Error("This shipment is already frozen. Check its recorded DHL result before trying again.");
      setParcelForm({ orderId, customsLines: data.customsLines, itemDescription: data.itemDescription, countryCode: data.countryCode, paidFreight: data.paidFreight, freightReviewEnabled: data.freightReviewEnabled });
    });
  }

  async function submitDhl(orderId: string, trackingNumber?: string, customsLines?: DhlCustomsLine[], measurements?: DhlParcel, itemDescription?: string, confirmedFreight?: number) {
    await updateOrder(orderId, async () => {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(trackingNumber ? "/api/dhl/schedule-pickup" : "/api/dhl/create-shipment", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || ""}` },
        body: JSON.stringify({ orderId, trackingNumber, customsLines, parcel: measurements, itemDescription, confirmedFreight }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (measurements && typeof data.current === "number" && typeof data.paid === "number") {
          setFreightReview({ parcel: measurements, current: data.current, paid: data.paid, confirmed: false });
        }
        throw new Error(data.error || "DHL request failed.");
      }
      setParcelForm(null);
      return trackingNumber ? "Pickup scheduled." : ["DHL label ready to download.", data.freightWarning].filter(Boolean).join(" ");
    });
  }

  function reviewFreight(orderId: string) {
    void updateOrder(orderId, async () => {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch("/api/dhl/create-shipment", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || ""}` },
        body: JSON.stringify({ orderId, parcel, action: "quote" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not check the packed parcel rate.");
      setFreightReview({ parcel, paid: data.paid, current: data.current, confirmed: false });
    });
  }

  function correctPhone(orderId: string, phone: string) {
    void updateOrder(orderId, async () => {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch("/api/dhl/create-shipment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || ""}` },
        body: JSON.stringify({ orderId, phone }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not correct the phone number.");
      return "DHL recipient phone saved.";
    });
  }

  function schedulePickup(order: Order) {
    const trackingNumber = order.dhlTrackingNumber;
    if (!trackingNumber) return;
    if (isDhlParcel(order.dhlParcel)) {
      void submitDhl(order.id, trackingNumber);
    } else {
      setParcel(blankParcel());
      setParcelForm({ orderId: order.id, trackingNumber, customsLines: [], itemDescription: "" });
    }
  }

  function setStatus(orderId: string, status: OrderStatus) {
    void updateOrder(orderId, async () => {
      await dataStore.updateOrderStatus(orderId, status);
      return `Order updated to ${statusLabel(status)}.`;
    });
  }

  function setProduction(orderId: string, index: number, value: Exclude<ItemProductionStatus, "not_applicable">) {
    void updateOrder(orderId, async () => {
      await dataStore.updateOrderItemProductionStatus(orderId, index, value);
      return "Production progress updated.";
    });
  }

  function resolveHold(orderId: string, reason: string, agreement: string, days: number) {
    void updateOrder(orderId, async () => {
      await dataStore.resolveOrderStockConflict(orderId, reason, agreement, days);
      return "Conflicting pieces converted to Made to Order.";
    });
  }

  const allocation = allocateCartonWeight(parcel.weight, activeParcelForm?.customsLines ?? []);
  const effectiveLines = activeParcelForm?.customsLines.map((line, index) => ({
    ...line, grossWeightKg: line.grossWeightKg ?? allocation[index],
  })) ?? [];
  const weightTotals = shipmentWeightTotals(effectiveLines);

  const currentReview = freightReview?.parcel === parcel ? freightReview : null;
  const difference = currentReview?.current != null && currentReview.current !== currentReview.paid;

  const packedParcelForm = activeParcelForm && (
    <form className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3" onSubmit={(event) => {
      event.preventDefault();
      void submitDhl(activeParcelForm.orderId, activeParcelForm.trackingNumber, effectiveLines, parcel, activeParcelForm.itemDescription, currentReview?.confirmed ? currentReview.current ?? undefined : undefined);
    }}>
      <h4 className="text-sm font-semibold">Packed parcel</h4>
      {!activeParcelForm.trackingNumber && (
        <label className="block text-xs font-medium">
          Shipment description
          <input required maxLength={DHL_SHIPMENT_DESCRIPTION_MAX} value={activeParcelForm.itemDescription}
            onChange={(event) => setParcelForm({ ...activeParcelForm, itemDescription: event.target.value })} className={field} />
          <span>{activeParcelForm.itemDescription.trim().length} / {DHL_SHIPMENT_DESCRIPTION_MAX}</span>
        </label>
      )}
      <label className="block text-xs font-medium">
        Sealed weight (kg)
        <input type="number" required min="0.001" step="0.001" value={parcel.weight || ""} onChange={(event) => setParcel({ ...parcel, weight: Number(event.target.value) })} className={field} />
      </label>
      <div className="grid grid-cols-3 gap-2">
        {MEASUREMENTS.map((dimension) => (
          <label key={dimension} className="min-w-0 text-xs font-medium capitalize">
            {dimension} (cm)
            <input type="number" required min="0.1" step="0.1" value={parcel.dimensions[dimension] || ""} onChange={(event) => setParcel({ ...parcel, dimensions: { ...parcel.dimensions, [dimension]: Number(event.target.value) } })} className={field} />
          </label>
        ))}
      </div>
      {activeParcelForm.customsLines.length > 0 && (
        <fieldset className="space-y-2 border-t border-zinc-200 pt-2">
          <legend className="text-xs font-semibold">Export customs lines</legend>
          <p className="text-xs text-zinc-700">Enter measured net weight. Joey allocates the remaining carton weight across the lines. You can edit the allocated gross weights.</p>
          <p className="text-xs">Net {weightTotals.netKg.toFixed(3)} kg · Gross {weightTotals.grossKg.toFixed(3)} kg · Packed {parcel.weight.toFixed(3)} kg · Difference {(parcel.weight - weightTotals.grossKg).toFixed(3)} kg</p>
          {hasUnconfirmedQuantityWeights(effectiveLines) && <p role="status" className="text-amber-800">Weight semantics for quantity &gt; 1 pending DHL confirmation.</p>}
          {activeParcelForm.customsLines.map((line, index) => (
            <div key={index} className="block rounded-lg border border-zinc-200 bg-white p-2.5 text-xs">
              <label className="block font-semibold">
                Customs description
                <textarea required minLength={DHL_CUSTOMS_DESCRIPTION_MIN} maxLength={DHL_CUSTOMS_DESCRIPTION_MAX}
                  value={line.description} onChange={(event) => setParcelForm({
                    ...activeParcelForm,
                    customsLines: activeParcelForm.customsLines.map((item, i) => i === index ? { ...item, description: event.target.value, confirmed: false } : item),
                  })} className={field} />
              </label>
              <p>{line.description.trim().length} / {DHL_CUSTOMS_DESCRIPTION_MAX} characters (minimum {DHL_CUSTOMS_DESCRIPTION_MIN}). Include item type, material or fibre, intended wearer, and made in Ghana.</p>
              {DHL_REQUIRE_INBOUND_HS && !line.inboundHsCode && <p className="text-red-700">Add the {activeParcelForm.countryCode} import HS code for this product.</p>}
              {!line.intendedWearer && <p className="text-red-700">Set the intended wearer in Products before booking.</p>}
              <label className="my-2 flex items-center gap-2">
                <input type="checkbox" required checked={line.confirmed ?? false} onChange={(event) => setParcelForm({
                  ...activeParcelForm,
                  customsLines: activeParcelForm.customsLines.map((item, i) => i === index ? { ...item, confirmed: event.target.checked } : item),
                })} /> I confirm this describes the actual goods.
              </label>
              <span className="mb-1 block text-zinc-700">{line.hsCode}{line.inboundHsCode && ` / ${line.inboundHsCode}`} · {line.quantity} × {money(line.price)}</span>
              <label className="block">
                Net weight per unit (kg)
                <input type="number" required min="0.001" step="0.001" value={line.weightKg || ""} onChange={(event) => {
                  const weightKg = Number(event.target.value);
                  setParcelForm({ ...activeParcelForm, customsLines: activeParcelForm.customsLines.map((item, i) => i === index ? { ...item, weightKg } : item) });
                }} className={field} />
              </label>
              <label className="mt-2 block">
                Gross weight per unit including carton allocation (kg)
                <input type="number" min={line.weightKg} step="0.001" placeholder={String(effectiveLines[index]?.grossWeightKg ?? line.weightKg)} value={line.grossWeightKg ?? ""} onChange={(event) => {
                  const grossWeightKg = event.target.value ? Number(event.target.value) : undefined;
                  setParcelForm({ ...activeParcelForm, customsLines: activeParcelForm.customsLines.map((item, i) => i === index ? { ...item, grossWeightKg } : item) });
                }} className={field} />
              </label>
            </div>
          ))}
        </fieldset>
      )}
      {activeParcelForm.freightReviewEnabled && (
        <div className="space-y-2 border-t border-zinc-200 pt-2 text-xs">
          <p>Paid shipping: {money(activeParcelForm.paidFreight ?? 0)} · Current DHL freight: {currentReview?.current != null ? money(currentReview.current) : "—"}</p>
          {currentReview?.current === null && <p role="status" className="text-amber-800">Rate unavailable. Booking can use the stored checkout freight.</p>}
          {difference && currentReview?.current != null && (
            <label className="flex items-center gap-2">
              <input type="checkbox" required checked={currentReview.confirmed} onChange={(event) => setFreightReview({ ...currentReview, confirmed: event.target.checked })} />
              Confirm DHL freight difference of {money(Math.round((currentReview.current - currentReview.paid) * 100) / 100)}. This does not change the amount paid.
            </label>
          )}
          <button type="button" disabled={!isDhlParcel(parcel) || workingId === activeParcelForm.orderId}
            onClick={() => reviewFreight(activeParcelForm.orderId)} className="font-semibold underline disabled:opacity-50">Check packed parcel rate</button>
        </div>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => setParcelForm(null)} disabled={workingId === activeParcelForm.orderId} className="rounded-lg px-2 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100">Cancel</button>
        <button
          type="submit"
          disabled={workingId === activeParcelForm.orderId || !isDhlParcel(parcel) || activeParcelForm.customsLines.some((line) => line.weightKg <= 0)}
          className="rounded-lg bg-zinc-950 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {workingId === activeParcelForm.orderId ? "Submitting…" : activeParcelForm.trackingNumber ? "Schedule pickup" : "Generate label"}
        </button>
      </div>
    </form>
  );

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl">
      <header className="mb-5 flex items-end justify-between gap-3 sm:mb-7">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">Orders</h1>
        {!isLoading && <span className="pb-1 text-sm font-medium text-zinc-700">{orders.length} {orders.length === 1 ? "order" : "orders"}</span>}
      </header>
      {loadError && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">Could not load the latest orders. <button type="button" onClick={() => void load()} className="font-semibold underline">Try again</button></p>}
      <section aria-label="Orders" className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm sm:rounded-3xl">
        {isLoading ? (
          <p role="status" className="px-5 py-12 text-center text-sm text-zinc-700">Loading orders…</p>
        ) : orders.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-5 text-center">
            <PackageOpen size={30} className="text-zinc-500" aria-hidden="true" />
            <h2 className="font-semibold text-zinc-950">No orders yet</h2>
          </div>
        ) : (
          <table className="w-full table-fixed border-collapse text-left">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-700">
              <tr>
                <th scope="col" className="w-[56%] px-3 py-3 sm:w-[28%] sm:px-5">Order</th>
                <th scope="col" className="hidden w-[23%] px-3 py-3 sm:table-cell">Customer</th>
                <th scope="col" className="hidden w-[13%] px-3 py-3 lg:table-cell">Pieces</th>
                <th scope="col" className="hidden w-[16%] px-3 py-3 sm:table-cell">Total</th>
                <th scope="col" className="px-2 py-3 sm:px-3">Progress</th>
                <th scope="col" className="w-7 pr-2 sm:w-10 sm:pr-4"><span className="sr-only">Details</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {orders.map((order) => {
                const number = formatOrderNumber(order);
                const pieces = order.items.reduce((count, item) => count + item.quantity, 0);
                return (
                  <tr key={order.id} onClick={() => selectOrder(order.id)} className="cursor-pointer transition hover:bg-zinc-50 focus-within:bg-zinc-50">
                    <td className="px-3 py-3 sm:px-5 sm:py-4">
                      <button type="button" aria-haspopup="dialog" aria-label={`Open order ${number}`} className="flex w-full min-w-0 items-center gap-2.5 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 sm:gap-3" onClick={(event) => {
                        event.stopPropagation();
                        selectOrder(order.id);
                      }}>
                        <OrderThumbnail src={order.items[0]?.image} />
                        <span className="min-w-0 space-y-0.5">
                          <strong className="block truncate text-sm font-semibold">{number}</strong>
                          <span className="block text-[11px] leading-tight text-zinc-700">{formatOrderPlacedAt(order.createdAt)}</span>
                          <span className="block truncate text-xs font-medium text-zinc-800 sm:hidden">{order.customerName}</span>
                        </span>
                      </button>
                    </td>
                    <td className="hidden px-3 py-3 sm:table-cell">
                      <p className="truncate text-sm font-medium">{order.customerName || "—"}</p>
                      <p className="mt-1 text-xs text-zinc-700">{fulfilmentLabel(order)}</p>
                    </td>
                    <td className="hidden px-3 py-3 text-sm text-zinc-700 lg:table-cell">{pieces}</td>
                    <td className="hidden px-3 py-3 text-sm font-semibold tabular-nums sm:table-cell">{money(order.total)}</td>
                    <td className="px-2 py-3 sm:px-3">
                      <p className="break-words text-xs font-medium leading-tight sm:text-sm">{orderProgressLabel(order)}</p>
                      <div className="mt-1"><PaymentBadge paid={order.paymentStatus === "paid"} /></div>
                    </td>
                    <td className="pr-2 text-zinc-700 sm:pr-4"><ChevronRight size={17} aria-hidden="true" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {selectedOrder && (
        <OrderDetailsDialog
          key={selectedOrder.id}
          order={selectedOrder}
          working={workingId === selectedOrder.id}
          notice={notice?.orderId === selectedOrder.id ? notice : null}
          onClose={() => { setSelectedId(null); setParcelForm(null); }}
          onStatus={(value) => setStatus(selectedOrder.id, value)}
          onProduction={(index, value) => setProduction(selectedOrder.id, index, value)}
          onResolve={(reason, agreement, days) => resolveHold(selectedOrder.id, reason, agreement, days)}
          onCreateShipment={() => void openShipment(selectedOrder.id)}
          onSchedulePickup={() => schedulePickup(selectedOrder)}
          onCorrectPhone={(phone) => correctPhone(selectedOrder.id, phone)}
          parcelForm={packedParcelForm}
        />
      )}
    </div>
  );
}
