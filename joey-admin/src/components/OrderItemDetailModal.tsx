"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { ItemProductionStatus, OrderItem } from "@/lib/types";
import { isVideoUrl } from "@/lib/isVideoUrl";
import { formatSizeLabel } from "@/lib/formatSizeLabel";
import { dataStore } from "@/lib/dataStore";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
  item: OrderItem | null;
  orderId?: string;
  itemIndex?: number;
  orderLabel: string;
  onProductionStatusUpdated?: () => void;
};

const PRODUCTION_STATUS_OPTIONS: Array<{
  value: Exclude<ItemProductionStatus, "not_applicable">;
  label: string;
}> = [
  { value: "queued", label: "Queued for Production" },
  { value: "in_production", label: "In Production (Tailoring)" },
  { value: "quality_check", label: "Quality Check & Pressing" },
  { value: "ready_for_dispatch", label: "Ready for Dispatch" },
];

export default function OrderItemDetailModal({
  open,
  onClose,
  item,
  orderId,
  itemIndex,
  orderLabel,
  onProductionStatusUpdated,
}: Props) {
  const [prodStatus, setProdStatus] = useState<Exclude<ItemProductionStatus, "not_applicable">>("queued");
  const [savingProd, setSavingProd] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (
      item?.productionStatus &&
      item.productionStatus !== "not_applicable"
    ) {
      setProdStatus(item.productionStatus);
    } else {
      setProdStatus("queued");
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, item]);

  if (!open || !item) return null;

  const lineTotal = item.price * item.quantity;
  const isMto =
    item.fulfillmentType === "made_to_order" ||
    Boolean(item.isMadeToOrder) ||
    Boolean(item.isBespoke);
  const leadDays = item.leadDays ?? item.bespokeLeadDays ?? 14;

  const handleSaveProductionStatus = async (
    nextStatus: Exclude<ItemProductionStatus, "not_applicable">,
  ) => {
    setProdStatus(nextStatus);
    if (!orderId || typeof itemIndex !== "number") return;
    setSavingProd(true);
    try {
      await dataStore.updateOrderItemProductionStatus(orderId, itemIndex, nextStatus);
      toast.success("Item production status updated.");
      onProductionStatusUpdated?.();
    } catch (err: any) {
      toast.error(err.message || "Could not update production status.");
    } finally {
      setSavingProd(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="fixed inset-0 bg-black/55 backdrop-blur-sm" aria-hidden onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-700">{orderLabel}</p>
            <h2 className="mt-1 truncate text-lg font-bold text-zinc-900">{item.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-600 hover:text-zinc-900" aria-label="Close">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid gap-6 sm:grid-cols-[260px,1fr]">
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
              <div className="flex aspect-[3/4] w-full items-center justify-center p-4">
                {isVideoUrl(item.image) ? (
                  <video
                    src={item.image}
                    className="max-h-full w-full object-contain"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    aria-label={item.name}
                  />
                ) : (
                  <img src={item.image} alt={item.name} className="h-full w-full object-contain" />
                )}
              </div>
            </div>

            <div className="space-y-4">
              {isMto ? (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex rounded-full bg-zinc-700 px-2.5 py-0.5 text-xs font-bold text-white">
                      Made to Order · {leadDays} Days Production
                    </span>
                    {item.estimatedReadyDate ? (
                      <span className="text-xs font-semibold text-zinc-800">
                        Est. Ready: {item.estimatedReadyDate}
                      </span>
                    ) : null}
                  </div>
                  {orderId && typeof itemIndex === "number" ? (
                    <div className="mt-3">
                      <label className="block text-xs font-semibold text-zinc-900">
                        Production Progress (Independent of Shipping)
                      </label>
                      <select
                        value={prodStatus}
                        disabled={savingProd}
                        onChange={(e) =>
                          void handleSaveProductionStatus(
                            e.target.value as Exclude<ItemProductionStatus, "not_applicable">,
                          )
                        }
                        className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm"
                      >
                        {PRODUCTION_STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-2.5 text-xs font-semibold text-emerald-900">
                  Fulfilment: Ready to Wear (Immediate Stock)
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-zinc-200 bg-white p-4">
                  <p className="text-xs font-semibold text-zinc-700">Size</p>
                  <p className="mt-2 text-xl font-bold text-zinc-900">{formatSizeLabel(item.size, item.fit, item.wearTag)}</p>
                </div>
                {item.fit && (
                  <div className="rounded-xl border border-zinc-200 bg-white p-4">
                    <p className="text-xs font-semibold text-zinc-700">Fit</p>
                    <p className="mt-2 text-xl font-bold text-zinc-900">{item.fit}</p>
                  </div>
                )}
                {(item.color || item.colorHex) && (
                  <div className="rounded-xl border border-zinc-200 bg-white p-4">
                    <p className="text-xs font-semibold text-zinc-700">Color</p>
                    <p className="mt-2 text-xl font-bold text-zinc-900 capitalize flex items-center gap-2">
                      {item.colorHex && <span style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: item.colorHex || "#ccc", backgroundImage: item.image ? `url(${item.image})` : "none", backgroundSize: "cover", backgroundPosition: "center", border: "1px solid #ccc", display: "inline-block" }} title={item.color} />}
                      {item.color}
                    </p>
                  </div>
                )}
                {item.combo && (
                  <div className="rounded-xl border border-zinc-200 bg-white p-4">
                    <p className="text-xs font-semibold text-zinc-700">Combo</p>
                    <p className="mt-2 text-xl font-bold text-zinc-900 capitalize">{item.combo}</p>
                  </div>
                )}
                <div className="rounded-xl border border-zinc-200 bg-white p-4">
                  <p className="text-xs font-semibold text-zinc-700">Quantity</p>
                  <p className="mt-2 text-xl font-bold text-zinc-900">{item.quantity}</p>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-zinc-700">Unit price</p>
                  <p className="font-mono text-sm font-semibold text-zinc-900">GHC {item.price.toLocaleString()}</p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-zinc-200 pt-3">
                  <p className="text-sm font-semibold text-zinc-900">Line total</p>
                  <p className="text-lg font-bold text-zinc-900">GHC {lineTotal.toLocaleString()}</p>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <p className="text-xs font-semibold text-zinc-700">Reference ID</p>
                <code className="mt-2 block break-all rounded-lg bg-zinc-100 px-3 py-2 text-xs font-mono text-zinc-900">
                  {item.skuKey || item.productId}
                </code>
              </div>

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Done
                </button>
                <Link
                  href="/products"
                  className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  Edit catalog
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
