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
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="presentation"
    >
      {/* Explicit Full-Viewport Backdrop */}
      <div 
        className="fixed inset-0 bg-[#000]/60 backdrop-blur-2xl" 
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-[92vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[2.5rem] bg-white p-2 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Inner container for scroll and padding */}
        <div className="flex flex-col overflow-y-auto px-6 pb-10 pt-6 custom-scrollbar">
          {/* Header */}
          <div className="mb-8 flex items-start justify-between px-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
                {orderLabel}
              </div>
              <h2 className="mt-2 text-4xl font-semibold tracking-tight text-zinc-900 leading-tight">
                {item.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ml-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-700 shadow-sm"
              aria-label="Close"
            >
              <X className="h-7 w-7" strokeWidth={2.5} />
            </button>
          </div>

          {/* Hero Image - Extra Large presentation with forced height */}
          <div className="relative mb-10 shrink-0 overflow-hidden rounded-[2.5rem] bg-zinc-50 shadow-sm ring-1 ring-zinc-100">
            <div className="flex h-[540px] w-full items-center justify-center">
              <img
                src={item.image}
                alt={item.name}
                className="max-h-full max-w-full object-contain p-6 transition duration-500 hover:scale-[1.05]"
              />
            </div>
          </div>

          {/* Details Overview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-zinc-50/80 p-4 ring-1 ring-zinc-100">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400">Selection</p>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-zinc-900">{item.size}</span>
                <span className="text-xs font-medium text-zinc-400">Size</span>
              </div>
            </div>
            <div className="rounded-2xl bg-zinc-50/80 p-4 ring-1 ring-zinc-100">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400">Quantity</p>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-zinc-900">{item.quantity}</span>
                <span className="text-xs font-medium text-zinc-400">Items</span>
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-zinc-900 p-5 text-white shadow-lg">
            <div className="flex items-center justify-between opacity-60">
              <span className="text-xs font-medium uppercase tracking-wider">Unit Price</span>
              <span className="font-mono text-sm">GHC {item.price.toLocaleString()}</span>
            </div>
            <div className="h-px bg-white/10" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-white/50">Total Amout</span>
              <span className="text-xl font-bold tracking-tight">
                GHC {lineTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Metadata */}
          <div className="mt-6 space-y-4 px-2">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400">Reference ID</span>
              <code className="text-[11px] font-medium text-zinc-500 break-all">{item.productId}</code>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex gap-3">
            <Link
              href="/products"
              className="flex h-12 flex-1 items-center justify-center rounded-xl bg-zinc-900 text-sm font-bold text-white transition hover:bg-zinc-800 active:scale-95"
            >
              Edit Catalog
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="flex h-12 flex-1 items-center justify-center rounded-xl border border-zinc-200 bg-white text-sm font-bold text-zinc-600 transition hover:bg-zinc-50 active:scale-95"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
