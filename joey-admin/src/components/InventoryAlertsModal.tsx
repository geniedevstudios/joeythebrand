"use client";

import { X, AlertTriangle, PackageX, Scissors, ExternalLink } from "lucide-react";
import Link from "next/link";

export type AlertStatus = "out" | "low" | "bespoke";

export interface AlertItem {
  id: string; // unique key, e.g. "product_id-variant_id-combo_id"
  productId: string;
  productName: string;
  productImage: string;
  variantName?: string;
  comboName?: string;
  quantity: number;
  status: AlertStatus;
}

interface InventoryAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: AlertItem[];
}

export default function InventoryAlertsModal({ isOpen, onClose, alerts }: InventoryAlertsModalProps) {
  if (!isOpen) return null;

  const outOfStock = alerts.filter(a => a.status === "out");
  const lowStock = alerts.filter(a => a.status === "low");
  const bespoke = alerts.filter(a => a.status === "bespoke");

  const renderSection = (title: string, items: AlertItem[], icon: React.ReactNode, emptyMsg: string) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-8 last:mb-0">
        <h3 className="flex items-center gap-2 text-lg font-bold text-zinc-900 mb-4 border-b border-zinc-200 pb-2">
          {icon}
          {title} ({items.length})
        </h3>
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-xl hover:border-zinc-300 transition-colors shadow-sm">
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 bg-zinc-100 rounded overflow-hidden shrink-0">
                  <img src={item.productImage || "/placeholder.png"} alt={item.productName} className="object-cover w-full h-full" />
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-900 text-base">{item.productName}</h4>
                  {(item.variantName || item.comboName) && (
                    <p className="text-sm text-zinc-500 font-medium">
                      {[item.variantName, item.comboName].filter(Boolean).join(" - ")}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Stock</p>
                  <p className={`font-bold ${item.status === 'out' ? 'text-red-600' : item.status === 'low' ? 'text-amber-600' : 'text-zinc-700'}`}>
                    {item.status === "bespoke" ? "Made to Order" : item.quantity}
                  </p>
                </div>
                <Link 
                  href={`/products?edit=${item.productId}`} 
                  onClick={onClose}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900 transition-colors text-sm font-semibold shrink-0"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="presentation">
      <div
        className="fixed inset-0 bg-black/55 backdrop-blur-sm"
        aria-hidden
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-50 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.04]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 bg-white px-6 py-5 shrink-0 z-10 shadow-sm">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">Inventory Alerts</h2>
            <p className="text-sm text-zinc-500 mt-0.5">Granular breakdown of low and out-of-stock items.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                <PackageX className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Inventory is Healthy!</h3>
                <p className="text-zinc-500 mt-1">There are no items running low on stock.</p>
              </div>
            </div>
          ) : (
            <div className="pb-8">
              {renderSection("Out of Stock", outOfStock, <PackageX className="h-5 w-5 text-red-600" />, "No out-of-stock items.")}
              {renderSection("Low Stock", lowStock, <AlertTriangle className="h-5 w-5 text-amber-600" />, "No low stock items.")}
              {renderSection("Made to Order", bespoke, <Scissors className="h-5 w-5 text-zinc-700" />, "No made-to-order items.")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
