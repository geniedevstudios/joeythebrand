"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X, Package, Hash } from "lucide-react";
import type { OrderItem } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  item: OrderItem | null;
  orderLabel: string;
};

export default function OrderItemDetailModal({ open, onClose, item, orderLabel }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !item) return null;

  const lineTotal = item.price * item.quantity;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#272B36]/65 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-item-modal-title"
        className="flex max-h-[min(92vh,720px)] w-full max-w-[420px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_64px_-12px_rgba(39,43,54,0.35)] ring-1 ring-black/[0.06]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Brand header — avoids theme zinc-500=white on body */}
        <header className="relative shrink-0 bg-[#272B36] px-5 pb-5 pt-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                <Package className="h-3.5 w-3.5 shrink-0 text-white/45" aria-hidden />
                <span>Line item</span>
                <span className="text-white/25" aria-hidden>
                  ·
                </span>
                <span className="font-mono font-normal tracking-normal text-white/70">{orderLabel}</span>
              </div>
              <h2
                id="order-item-modal-title"
                className="mt-3 text-balance text-[1.35rem] font-semibold leading-snug tracking-tight text-white"
              >
                {item.name}
              </h2>
              <div
                className="mt-4 flex flex-wrap gap-2"
                aria-label={`Size ${item.size}, quantity ${item.quantity}`}
              >
                <div className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.08] px-3 py-2 backdrop-blur-sm">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">Size</span>
                  <span className="text-base font-semibold tabular-nums tracking-tight text-white">{item.size}</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.08] px-3 py-2 backdrop-blur-sm">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">Qty</span>
                  <span className="text-base font-semibold tabular-nums tracking-tight text-white">
                    {item.quantity}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl border border-white/20 bg-white/10 p-2 text-white/80 transition hover:border-white/30 hover:bg-white/15 hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-5">
          <figure className="overflow-hidden rounded-xl border border-neutral-200/90 bg-neutral-100 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
            <div className="relative aspect-[3/4] max-h-[min(42vh,340px)] w-full overflow-hidden rounded-lg bg-neutral-200 shadow-md ring-1 ring-black/[0.04]">
              <img
                src={item.image}
                alt={item.name}
                className="h-full w-full object-cover object-center"
              />
            </div>
            <figcaption className="mt-2 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-400">
              Product image
            </figcaption>
          </figure>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-neutral-200 bg-gradient-to-b from-white to-neutral-50/80 px-4 py-3.5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Size</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums leading-none tracking-tight text-neutral-900">
                {item.size}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-gradient-to-b from-white to-neutral-50/80 px-4 py-3.5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Quantity</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums leading-none tracking-tight text-neutral-900">
                {item.quantity}
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-900 text-white shadow-sm">
            <div className="grid grid-cols-2 divide-x divide-white/10">
              <div className="px-4 py-3.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Unit</p>
                <p className="mt-1.5 text-sm font-semibold tabular-nums text-white/95">
                  GHC {item.price.toLocaleString()}
                </p>
              </div>
              <div className="px-4 py-3.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Line total</p>
                <p className="mt-1.5 text-lg font-bold tabular-nums tracking-tight text-white">
                  GHC {lineTotal.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50/90 px-3.5 py-3">
            <Hash className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">Product ID</p>
              <p className="mt-1 break-all font-mono text-[11px] leading-relaxed text-neutral-800">
                {item.productId}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/products"
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#272B36] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#323846] active:scale-[0.99]"
            >
              Open catalog
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
