"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
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
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Explicit full-viewport backdrop */}
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
          <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
              <div className="flex aspect-[3/4] w-full items-center justify-center p-4">
                <img src={item.image} alt={item.name} className="h-full w-full object-contain" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-zinc-200 bg-white p-4">
                  <p className="text-xs font-semibold text-zinc-700">Size</p>
                  <p className="mt-2 text-xl font-bold text-zinc-900">{item.size}</p>
                </div>
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
                  {item.productId}
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
