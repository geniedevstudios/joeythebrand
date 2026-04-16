"use client";

import { X, ExternalLink, ShoppingBag, CalendarDays } from "lucide-react";
import { formatOrderPlacedAt } from "@/lib/formatOrderPlacedAt";
import type { Order, ConsultationBooking } from "@/lib/types";

interface RevenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  consultations: ConsultationBooking[];
}

type UnifiedPayment = {
  id: string;
  type: "order" | "consultation";
  customerName: string;
  customerEmail: string;
  description: string;
  refId: string;
  amount: number;
  createdAt: string;
};

export default function RevenueModal({ isOpen, onClose, orders, consultations }: RevenueModalProps) {
  if (!isOpen) return null;

  // Combine and sort by date descending
  const paidConsultations = consultations.filter((c) => c.paymentStatus === "paid");

  const payments: UnifiedPayment[] = [
    ...orders.map((o) => ({
      id: o.id,
      type: "order" as const,
      customerName: o.customerName,
      customerEmail: o.customerEmail,
      description: o.items.map((i) => i.name).join(", "),
      refId: o.orderNumber || o.id.slice(0, 8).toUpperCase(),
      amount: o.total,
      createdAt: o.createdAt,
    })),
    ...paidConsultations.map((c) => ({
      id: c.id,
      type: "consultation" as const,
      customerName: c.customerName,
      customerEmail: c.customerEmail,
      description: `Consultation: ${c.service}`,
      refId: c.bookingCode || c.id.slice(0, 8).toUpperCase(),
      amount: c.priceGhs || 0,
      createdAt: c.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

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
        className="relative flex h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.04]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-zinc-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">Revenue Breakdown</h2>
            <p className="text-sm text-zinc-800 mt-0.5">Tracking all successful orders and paid consultations.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-800">Total Revenue</span>
              <span className="text-lg font-bold text-zinc-900 leading-none mt-0.5">GHC {totalRevenue.toLocaleString()}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              aria-label="Close"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 z-10 bg-zinc-100 border-b border-zinc-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900">Date & Time</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900">Customer</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900">Service/Products</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900">Ref ID</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-800 italic">
                    No payment history found.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={`${payment.type}-${payment.id}`} className="group hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-800">
                      {formatOrderPlacedAt(payment.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-zinc-900">{payment.customerName}</span>
                        <span className="text-xs text-zinc-700 truncate max-w-[200px]" title={payment.customerEmail}>
                          {payment.customerEmail}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="shrink-0 p-1.5 rounded-md bg-zinc-100 text-zinc-600 group-hover:text-zinc-800 transition-colors">
                          {payment.type === "order" ? (
                            <ShoppingBag className="h-3.5 w-3.5" />
                          ) : (
                            <CalendarDays className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <span className="text-sm text-zinc-700 line-clamp-1 truncate max-w-[300px]" title={payment.description}>
                          {payment.description}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono font-medium text-zinc-800 bg-zinc-100 px-2 py-1 rounded">
                        {payment.refId}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-zinc-900">GHC {payment.amount.toLocaleString()}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info (mobile only total) */}
        <div className="sm:hidden border-t border-zinc-100 bg-zinc-50 p-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-800">Total Revenue</span>
            <span className="text-lg font-bold text-zinc-900">GHC {totalRevenue.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
