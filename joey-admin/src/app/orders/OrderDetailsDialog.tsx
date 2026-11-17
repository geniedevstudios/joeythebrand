import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Download, MapPin, Truck, X } from "lucide-react";
import AdminStyledSelect from "@/components/AdminStyledSelect";
import { formatOrderNumber } from "@/lib/formatOrderNumber";
import { formatOrderPlacedAt } from "@/lib/formatOrderPlacedAt";
import { formatSizeLabel } from "@/lib/formatSizeLabel";
import { parseShippingAddressDisplay } from "@/lib/formatShippingAddress";
import type { ItemProductionStatus, Order, OrderStatus } from "@/lib/types";
import { isDhlOrder } from "@/lib/orderStatusRules";
import { customerOrderNote, fulfilmentLabel, isMadeToOrder, money, orderProgressLabel, statusOptionsForOrder } from "./orderDisplay";
import OrderThumbnail from "./OrderThumbnail";

const PRODUCTION_OPTIONS: { value: Exclude<ItemProductionStatus, "not_applicable">; label: string }[] = [
  { value: "queued", label: "Queued for production" },
  { value: "in_production", label: "In production" },
  { value: "quality_check", label: "Quality check and pressing" },
  { value: "ready_for_dispatch", label: "Ready for dispatch" },
];

const card = "min-w-0 rounded-2xl border border-zinc-200 bg-white p-4";
const primaryButton = "inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-50";

export function PaymentBadge({ paid }: { paid: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${paid ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
      {paid ? "Paid" : "Unpaid"}
    </span>
  );
}

type Props = {
  order: Order;
  working: boolean;
  onClose: () => void;
  onStatus: (value: OrderStatus) => void;
  onProduction: (index: number, value: Exclude<ItemProductionStatus, "not_applicable">) => void;
  onResolve: (reason: string, agreement: string, days: number) => void;
  notice: { text: string; error?: boolean } | null;
  onCreateShipment: () => void;
  onSchedulePickup: () => void;
  onCorrectPhone: (phone: string) => void;
  parcelForm: ReactNode;
};

export default function OrderDetailsDialog({
  order, working, onClose, onStatus, onProduction, onResolve, onCreateShipment, onSchedulePickup, onCorrectPhone, parcelForm, notice,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [correctedPhone, setCorrectedPhone] = useState("");
  const [showResolution, setShowResolution] = useState(false);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  const number = formatOrderNumber(order);
  const shipping = parseShippingAddressDisplay(order.shippingAddress);
  const note = customerOrderNote(order.notes, shipping);
  const hasDhl = isDhlOrder(order);
  const statusOptions = statusOptionsForOrder(order);
  const hold = order.stockConflictFlagged || order.status === "paid_requires_resolution";
  const paid = order.paymentStatus === "paid";
  const pickupConfirmed = order.dhlPickupConfirmation || order.dhlStatus?.startsWith("Pickup Scheduled");
  const labelHref = order.dhlLabelUrl && (order.dhlLabelUrl.startsWith("data:")
    ? order.dhlLabelUrl
    : `data:application/pdf;base64,${order.dhlLabelUrl}`);
  const pieces = order.items.reduce((count, item) => count + item.quantity, 0);

  return (
    <dialog
      ref={ref}
      aria-labelledby="order-details-title"
      className="fixed inset-0 m-auto w-[calc(100%-1.5rem)] max-w-5xl overflow-visible bg-transparent p-0 text-zinc-950 backdrop:bg-zinc-950/55 backdrop:backdrop-blur-[2px]"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 shadow-2xl sm:max-h-[88dvh] sm:rounded-3xl">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-4 sm:px-7 sm:py-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-700">{number} <span className="px-1 text-zinc-400">·</span> {formatOrderPlacedAt(order.createdAt)}</p>
            <h2 id="order-details-title" className="mt-1 break-words text-xl font-semibold tracking-tight sm:text-2xl">
              {order.customerName || "Order details"}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <PaymentBadge paid={paid} />
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-800">{fulfilmentLabel(order)}</span>
              <span className="rounded-full border border-zinc-200 px-2.5 py-1 text-[11px] font-medium text-zinc-700">{orderProgressLabel(order)}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close order" className="grid size-10 shrink-0 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2">
            <X size={19} aria-hidden="true" />
          </button>
        </header>

        {notice && (
          <p role={notice.error ? "alert" : "status"} className={`mx-4 mt-3 shrink-0 rounded-xl border px-4 py-3 text-sm sm:mx-7 ${notice.error ? "border-red-200 bg-red-50 text-red-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
            {notice.text}
          </p>
        )}
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-7 sm:py-6">
          {hold && (
            <section className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
              <h3 className="text-sm font-semibold">Stock conflict hold</h3>
              <p className="mt-1 text-sm">Payment completed after the stock reservation expired. Confirm a resolution with the customer.</p>
              {showResolution ? (
                <form className="mt-4 grid gap-3" onSubmit={(event) => {
                  event.preventDefault();
                  const fields = new FormData(event.currentTarget);
                  const reason = String(fields.get("reason") ?? "").trim();
                  const agreement = String(fields.get("agreement") ?? "").trim();
                  const days = Number(fields.get("days"));
                  if (reason && agreement) onResolve(reason, agreement, days);
                }}>
                  <label className="grid gap-1 text-xs font-semibold">
                    Reason and proposed resolution
                    <textarea name="reason" required rows={2} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-normal" />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold">
                    Customer agreement
                    <textarea name="agreement" required rows={2} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-normal" />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold">
                    Agreed production time (calendar days)
                    <input name="days" type="number" required min={1} max={180} step={1} className="w-28 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-normal" />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" disabled={working} className="rounded-lg bg-red-900 px-3 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50">Convert affected pieces to Made to Order</button>
                    <button type="button" onClick={() => setShowResolution(false)} disabled={working} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold">Cancel</button>
                  </div>
                </form>
              ) : (
                <button type="button" disabled={working} onClick={() => setShowResolution(true)} className="mt-3 rounded-lg bg-red-900 px-3 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50">
                  Record customer agreement
                </button>
              )}
            </section>
          )}

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
            <section className={card}>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-base font-semibold tracking-tight">Pieces</h3>
                <span className="text-xs font-medium text-zinc-600">{pieces} {pieces === 1 ? "piece" : "pieces"}</span>
              </div>
              <ul className="mt-3 divide-y divide-zinc-200">
                {order.items.map((item, index) => {
                  const madeToOrder = isMadeToOrder(item);
                  const production = item.productionStatus && item.productionStatus !== "not_applicable" ? item.productionStatus : "queued";
                  const productionLabelId = `production-${order.id}-${index}`;
                  return (
                    <li key={`${item.productId}-${index}`} className="py-3">
                      <div className="flex items-start gap-3">
                        <OrderThumbnail src={item.image} />
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-semibold">{item.name}</p>
                          <p className="mt-1 text-xs leading-5 text-zinc-700">
                            {item.colorHex && <span className="mr-1.5 inline-block size-2.5 rounded-full border border-zinc-300 align-middle" style={{ backgroundColor: item.colorHex }} aria-hidden="true" />}
                            {[item.color, item.combo, formatSizeLabel(item.size, item.fit, item.wearTag), item.fit && `${item.fit} fit`, `Qty ${item.quantity}`].filter(Boolean).join(" · ")}
                          </p>
                          <span className="mt-1 inline-flex rounded-full bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-700">
                            {madeToOrder ? "Made to Order" : "Ready to Wear"}
                          </span>
                        </div>
                        <p className="shrink-0 text-right text-sm font-semibold tabular-nums">{money(item.price * item.quantity)}</p>
                      </div>
                      {madeToOrder && (
                        <div className="mt-3 rounded-xl bg-zinc-50 p-3">
                          <div className="flex flex-wrap items-baseline justify-between gap-1">
                            <span id={productionLabelId} className="text-xs font-semibold">Production progress</span>
                            <span className="text-xs text-zinc-700">{item.estimatedReadyDate ? `Est. ready ${item.estimatedReadyDate}` : `${item.leadDays ?? item.bespokeLeadDays ?? 14} days lead time`}</span>
                          </div>
                          <AdminStyledSelect
                            labelledBy={productionLabelId}
                            value={production}
                            options={PRODUCTION_OPTIONS}
                            disabled={working}
                            onValueChange={(value) => onProduction(index, value as Exclude<ItemProductionStatus, "not_applicable">)}
                            wrapperClassName="mt-2"
                          />
                        </div>
                      )}
                      <details className="mt-2 text-xs text-zinc-700">
                        <summary className="cursor-pointer font-medium">Item details</summary>
                        <p className="mt-1">Unit price · {money(item.price)}</p>
                        <p className="break-all">Reference · {item.skuKey || item.productId}</p>
                      </details>
                    </li>
                  );
                })}
              </ul>
              {order.items.length === 0 && <p className="my-3 text-sm text-zinc-600">No items recorded.</p>}

              <dl className="space-y-2 border-t border-zinc-200 pt-4 text-sm tabular-nums">
                <div className="flex justify-between gap-2"><dt className="text-zinc-700">Subtotal</dt><dd>{money(order.subtotal ?? order.items.reduce((total, item) => total + item.price * item.quantity, 0))}</dd></div>
                {order.shippingCost !== undefined && (
                  <div className="flex justify-between gap-2"><dt className="text-zinc-700">Shipping</dt><dd>{money(order.shippingCost)}</dd></div>
                )}
                {order.discount > 0 && (
                  <div className="flex justify-between gap-2"><dt className="text-zinc-700">Discount{order.promotionCode ? ` · ${order.promotionCode}` : ""}</dt><dd>−{money(order.discount)}</dd></div>
                )}
                <div className="flex justify-between gap-2 border-t border-zinc-200 pt-3 text-base font-semibold"><dt>Total</dt><dd>{money(order.total)}</dd></div>
              </dl>
              <Link href="/products" className="mt-4 inline-flex text-xs font-medium text-zinc-700 underline underline-offset-4 hover:text-zinc-950">Edit catalogue</Link>
            </section>

            <div className="grid min-w-0 gap-4">
              <section className={card}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight"><MapPin size={16} aria-hidden="true" /> Delivery</h3>
                  {shipping.international && <span className="text-xs font-medium text-zinc-700">International</span>}
                </div>
                <div className="mt-3 space-y-1.5 break-words text-sm text-zinc-700">
                  <p className="font-medium text-zinc-950">{order.customerName}</p>
                  {order.customerEmail && <p className="break-all">{order.customerEmail}</p>}
                  {order.customerPhone && <p>{order.customerPhone}</p>}
                  <p className="pt-1 leading-relaxed">{shipping.address}</p>
                  {shipping.carrier === "custom" && <p className="font-medium">Custom shipping</p>}
                </div>
                {hasDhl && (
                  <div className="mt-4 space-y-2.5 border-t border-zinc-200 pt-4">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Truck size={16} aria-hidden="true" />
                      <span className="min-w-0 break-all">DHL{order.dhlTrackingNumber ? ` · ${order.dhlTrackingNumber}` : ""}</span>
                      {(order.dhlTrackingNumber || order.dhlShipmentClaimedAt) && <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs">{order.dhlEnvironment?.toUpperCase() ?? "UNKNOWN"}</span>}
                    </div>
                    <details className="text-xs">
                      <summary className="cursor-pointer font-semibold">Correct recipient phone</summary>
                      <form className="mt-2 space-y-2" onSubmit={(event) => { event.preventDefault(); onCorrectPhone(correctedPhone); }}>
                        <label className="block">Full international phone number
                          <input type="tel" required placeholder="+233…" value={correctedPhone}
                            onChange={(event) => setCorrectedPhone(event.target.value)} className="mt-1 block w-full rounded border border-zinc-300 p-2" />
                        </label>
                        {order.dhlTrackingNumber && <p>This does not update an already issued DHL record.</p>}
                        <button type="submit" disabled={working || Boolean(order.dhlShipmentClaimedAt || order.dhlPickupClaimedAt)} className="font-semibold underline disabled:opacity-50">Save phone</button>
                      </form>
                    </details>
                    {order.dhlStatus && !order.dhlStatus.startsWith("[") &&
                      !(order.dhlPickupConfirmation && order.dhlStatus.startsWith("Pickup Scheduled")) && (
                      <p className="text-xs text-zinc-700">
                        {order.dhlStatus === "Manifested" ? "Label created. Awaiting DHL collection." : order.dhlStatus}
                      </p>
                    )}
                    {labelHref && (
                      <a href={labelHref} download={`DHL_Label_${order.dhlTrackingNumber || number}.pdf`} className={primaryButton}>
                        <Download size={16} aria-hidden="true" /> Download label
                      </a>
                    )}
                    {order.dhlShipmentDescription && (
                      <details className="text-xs">
                        <summary className="cursor-pointer font-semibold">Submitted DHL details</summary>
                        <p className="mt-2">{order.dhlShipmentDescription}</p>
                        {order.dhlCustomsLines?.map((line) => (
                          <p key={line.number} className="mt-1 break-words">{line.quantity.value} × {line.description} · {line.weight.netValue} kg net / {line.weight.grossValue} kg gross</p>
                        ))}
                      </details>
                    )}
                    {order.dhlParcel && <p className="text-xs text-zinc-700">Packed weight · {order.dhlParcel.weight} kg</p>}
                    {order.dhlPickupConfirmation && <p className="text-xs text-zinc-700">Pickup scheduled · {order.dhlPickupConfirmation}</p>}
                    {order.dhlPickupClaimedAt && !pickupConfirmed && <p className="text-xs text-zinc-700">Pickup pending DHL confirmation</p>}
                    {order.dhlShipmentClaimedAt && !order.dhlTrackingNumber && <p className="text-xs text-zinc-700">Shipment pending DHL confirmation</p>}
                    {parcelForm || (order.dhlTrackingNumber ? (
                      !pickupConfirmed && !order.dhlPickupClaimedAt && (
                        <button type="button" onClick={onSchedulePickup} disabled={working || !paid || hold || order.status === "cancelled"} className={secondaryButton}>
                          Schedule pickup
                        </button>
                      )
                    ) : !order.dhlShipmentClaimedAt && (
                      <>
                        <button type="button" onClick={onCreateShipment} disabled={working || !paid || hold || order.status !== "order packaged"} className={primaryButton}>
                          Create DHL shipment
                        </button>
                        {(!paid || hold || order.status !== "order packaged") && (
                          <p className="text-xs text-zinc-700">A paid, packaged order is needed to create a label.</p>
                        )}
                      </>
                    ))}
                  </div>
                )}
              </section>
              <div className={`grid min-w-0 items-start gap-3 ${note ? "grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)]" : ""}`}>
                <section className={card}>
                  <h3 id="order-progress-label" className="text-base font-semibold tracking-tight">Order progress</h3>
                  {statusOptions.length > 0 ? (
                    <AdminStyledSelect
                      labelledBy="order-progress-label"
                      value={order.status}
                      disabled={working || hold}
                      options={statusOptions}
                      onValueChange={(value) => onStatus(value as OrderStatus)}
                      wrapperClassName="mt-2.5"
                    />
                  ) : (
                    <div className="mt-2 text-sm">
                      <p className="font-semibold">{orderProgressLabel(order)}</p>
                      <p className="mt-1 text-xs text-zinc-700">
                        {order.dhlTrackingNumber ? "Delivery updates come from DHL tracking." : "Waiting for DHL to confirm the shipment."}
                      </p>
                    </div>
                  )}
                  {working && <p role="status" className="mt-2 text-xs text-zinc-700">Updating order…</p>}
                </section>
                {note && (
                  <section className={card}>
                    <h3 className="text-base font-semibold tracking-tight">Notes</h3>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-700">{note}</p>
                  </section>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
