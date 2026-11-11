"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { dataStore } from "@/lib/dataStore";
import { formatOrderNumber } from "@/lib/formatOrderNumber";
import { formatOrderPlacedAt } from "@/lib/formatOrderPlacedAt";
import type { Product, Order, PromotionCode, ConsultationBooking } from "@/lib/types";
import {
  ShoppingBag,
  ShoppingCart,
  ClipboardList,
  Tag,
  CalendarDays,
  ExternalLink,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import RevenueModal from "@/components/RevenueModal";
import InventoryAlertsModal, { AlertItem } from "@/components/InventoryAlertsModal";

/** Ghana cedi (₵) — Lucide has no cedi glyph */
function CediIcon({ className }: { className?: string }) {
  return (
    <span className={`flex items-center justify-center ${className ?? ""}`} aria-hidden>
      <span className="text-[1.15rem] font-bold leading-none tracking-tight">₵</span>
    </span>
  );
}

type DashboardStat = {
  name: string;
  stat: string;
  icon: LucideIcon | typeof CediIcon;
  clickable: boolean;
  onClick: () => void;
  badge?: number;
};

export default function Dashboard() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [promotions, setPromotions] = useState<PromotionCode[]>([]);
  const [consultations, setConsultations] = useState<ConsultationBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, o, pr, c] = await Promise.all([
        dataStore.getProducts(),
        dataStore.getOrders(),
        dataStore.getPromotions(),
        dataStore.getConsultationBookings(),
      ]);
      setProducts(p);
      setOrders(o);
      setPromotions(pr);
      setConsultations(c);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const unsubscribe = dataStore.subscribe(load);
    return unsubscribe;
  }, [load]);

  const orderRevenue = orders
    .filter((o) => o.paymentStatus === "paid")
    .reduce((sum, order) => sum + order.total, 0);
  const consultationRevenue = consultations
    .filter((c) => c.paymentStatus === "paid")
    .reduce((sum, c) => sum + (c.priceGhs || 0), 0);

  const totalRevenue = orderRevenue + consultationRevenue;
  const activePromos = promotions.filter((p) => p.active).length;
  const processingOrdersCount = orders.filter((o) => o.status === "processing").length;
  /** Shop + portfolio rows share `consultation_bookings`; status `pending` = awaiting admin action */
  const pendingConsultationsCount = consultations.filter((c) => c.status === "pending").length;

  const stats: DashboardStat[] = [
    { 
      name: "Total Revenue", 
      stat: `GHC ${totalRevenue.toLocaleString()}`, 
      icon: CediIcon,
      clickable: true,
      onClick: () => setIsRevenueModalOpen(true)
    },
    {
      name: "New orders",
      stat: processingOrdersCount.toLocaleString(),
      icon: ClipboardList,
      clickable: true,
      onClick: () => router.push("/orders"),
    },
    { 
      name: "Total Products", 
      stat: products.length.toString(), 
      icon: ShoppingBag,
      clickable: true,
      onClick: () => router.push("/products")
    },
    { 
      name: "Active Promotions", 
      stat: activePromos.toString(), 
      icon: Tag,
      clickable: true,
      onClick: () => router.push("/promotions")
    },
    {
      name: "Consultations",
      stat: pendingConsultationsCount.toLocaleString(),
      icon: CalendarDays,
      clickable: true,
      onClick: () => router.push("/content/consultations"),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-6rem)] w-full min-w-0 items-center justify-center text-[#1c1e22]">
        <div className="text-sm text-[#1c1e22]/80">Loading dashboard…</div>
      </div>
    );
  }

  const granularAlerts: AlertItem[] = [];

  products.forEach((p) => {
    const isBespoke = !!p.bespokeAvailable;
    const baseItem = {
      productId: p.id,
      productName: p.name,
      productImage: p.image,
    };

    if (p.variants && p.variants.length > 0) {
      p.variants.forEach((v) => {
        if (v.type === "fit_combo") {
          // In "Fits Only" mode, the "Original" button in the storefront allows purchasing the general product!
          // So we must generate an alert for the general product here.
          const generalIsBespoke = isBespoke;
          const generalIsOut = !!p.isOutOfStock;
          const generalQ = p.quantity ?? 0;
          if (generalIsBespoke) {
            granularAlerts.push({ ...baseItem, id: `${p.id}-base`, variantName: "Original (Base)", quantity: generalQ, status: "bespoke" });
          } else if (generalIsOut || generalQ <= 0) {
            granularAlerts.push({ ...baseItem, id: `${p.id}-base`, variantName: "Original (Base)", quantity: generalQ, status: "out" });
          } else if (generalQ < 5) {
            granularAlerts.push({ ...baseItem, id: `${p.id}-base`, variantName: "Original (Base)", quantity: generalQ, status: "low" });
          }

          if (v.combos && v.combos.length > 0) {
            v.combos.forEach((c) => {
              const cIsBespoke = isBespoke || !!c.bespokeAvailable;
              const cIsOut = !!c.isOutOfStock;
              const cQ = c.quantity ?? 0;
              
              if (cIsBespoke) {
                granularAlerts.push({ ...baseItem, id: `${p.id}-${v.id}-${c.id}`, variantName: v.name, comboName: c.name, quantity: cQ, status: "bespoke" });
              } else if (cIsOut || cQ <= 0) {
                granularAlerts.push({ ...baseItem, id: `${p.id}-${v.id}-${c.id}`, variantName: v.name, comboName: c.name, quantity: cQ, status: "out" });
              } else if (cQ < 5) {
                granularAlerts.push({ ...baseItem, id: `${p.id}-${v.id}-${c.id}`, variantName: v.name, comboName: c.name, quantity: cQ, status: "low" });
              }
            });
          } else {
            // Old system fallback: flat fit_combo
            const vIsBespoke = isBespoke || !!v.bespokeAvailable;
            const vIsOut = !!v.isOutOfStock;
            const vQ = v.quantity ?? 0;
            if (vIsBespoke) {
              granularAlerts.push({ ...baseItem, id: `${p.id}-${v.id}`, variantName: v.name, quantity: vQ, status: "bespoke" });
            } else if (vIsOut || vQ <= 0) {
              granularAlerts.push({ ...baseItem, id: `${p.id}-${v.id}`, variantName: v.name, quantity: vQ, status: "out" });
            } else if (vQ < 5) {
              granularAlerts.push({ ...baseItem, id: `${p.id}-${v.id}`, variantName: v.name, quantity: vQ, status: "low" });
            }
          }
        } else {
          // Color variant
          // Evaluate the base color first
          const vIsBespoke = isBespoke || !!v.bespokeAvailable;
          const vIsOut = !!v.isOutOfStock;
          const vQ = v.quantity ?? 0;
          
          // Add alert for the base variant (color)
          if (vIsBespoke) {
            granularAlerts.push({ ...baseItem, id: `${p.id}-${v.id}-base`, variantName: v.name, quantity: vQ, status: "bespoke" });
          } else if (vIsOut || vQ <= 0) {
            granularAlerts.push({ ...baseItem, id: `${p.id}-${v.id}-base`, variantName: v.name, quantity: vQ, status: "out" });
          } else if (vQ < 5) {
            granularAlerts.push({ ...baseItem, id: `${p.id}-${v.id}-base`, variantName: v.name, quantity: vQ, status: "low" });
          }

          // Evaluate the combos (if any)
          if (v.combos && v.combos.length > 0) {
            v.combos.forEach((c) => {
              const cIsBespoke = isBespoke || !!c.bespokeAvailable;
              const cIsOut = !!c.isOutOfStock;
              const cQ = c.quantity ?? 0;
              
              if (cIsBespoke) {
                granularAlerts.push({ ...baseItem, id: `${p.id}-${v.id}-${c.id}`, variantName: v.name, comboName: c.name, quantity: cQ, status: "bespoke" });
              } else if (cIsOut || cQ <= 0) {
                granularAlerts.push({ ...baseItem, id: `${p.id}-${v.id}-${c.id}`, variantName: v.name, comboName: c.name, quantity: cQ, status: "out" });
              } else if (cQ < 5) {
                granularAlerts.push({ ...baseItem, id: `${p.id}-${v.id}-${c.id}`, variantName: v.name, comboName: c.name, quantity: cQ, status: "low" });
              }
            });
          }
        }
      });
    } else {
      const q = p.quantity ?? 0;
      if (isBespoke) {
        granularAlerts.push({ ...baseItem, id: p.id, quantity: q, status: "bespoke" });
      } else if (q <= 0) {
        granularAlerts.push({ ...baseItem, id: p.id, quantity: q, status: "out" });
      } else if (q < 5) {
        granularAlerts.push({ ...baseItem, id: p.id, quantity: q, status: "low" });
      }
    }
  });

  const outOfStock = granularAlerts.filter((a) => a.status === "out");
  const lowStock = granularAlerts.filter((a) => a.status === "low");
  const bespokeProducts = granularAlerts.filter((a) => a.status === "bespoke");
  const inventoryAlerts = outOfStock.length + lowStock.length + bespokeProducts.length;

  const recentOrders = orders.slice(0, 6);

  return (
    <div className="min-h-[calc(100vh-6rem)] w-full min-w-0 max-w-none text-[#1c1e22]">
      <div className="w-full min-w-0 max-w-none space-y-6">
        {/* Main grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-12">
          {/* Feature card */}
          <section className="min-w-0 sm:col-span-6">
            <div className="relative overflow-hidden rounded-3xl border border-[#b6b7ba]/70 bg-white p-6 shadow-[0_14px_40px_rgba(28,30,34,0.08)]">
              <div
                className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#b6b7ba]/35 blur-3xl"
                aria-hidden
              />
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1c1e22]/60">
                    Revenue snapshot
                  </p>
                  <h2 className="mt-2 text-4xl font-semibold tracking-tight text-[#1c1e22]">
                    {stats[0]?.stat ?? `GHC ${totalRevenue.toLocaleString()}`}
                  </h2>
                  <p className="mt-2 text-sm text-[#1c1e22]/70">
                    Total paid revenue (orders + paid consultations).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRevenueModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-[#b6b7ba]/80 bg-[#f5f1eb] px-4 py-2 text-sm font-semibold text-[#1c1e22]/90 transition hover:bg-[#ebe8e2]"
                >
                  View
                  <ExternalLink className="h-4 w-4 text-[#1c1e22]/70" />
                </button>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/orders")}
                  className="rounded-2xl border border-[#b6b7ba]/70 bg-[#f5f1eb] p-4 text-left transition hover:bg-[#ebe8e2]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1c1e22]/60">
                      Total orders
                    </p>
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#b6b7ba]/45 text-[#1c1e22] ring-1 ring-[#b6b7ba]/80"
                      aria-hidden
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-2xl font-semibold tracking-tight">{orders.length.toLocaleString()}</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAlertsModalOpen(true)}
                  className="rounded-2xl border border-[#b6b7ba]/70 bg-[#f5f1eb] p-4 text-left transition hover:bg-[#ebe8e2]"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1c1e22]/60">
                    Inventory alerts
                  </p>
                  <div className="mt-2 flex items-baseline justify-between gap-3">
                    <p className="text-2xl font-semibold tracking-tight">{inventoryAlerts.toLocaleString()}</p>
                    <span className="text-xs font-semibold text-[#1c1e22]/60">
                      {outOfStock.length ? `${outOfStock.length} out` : ""}
                      {outOfStock.length && lowStock.length ? " · " : ""}
                      {lowStock.length ? `${lowStock.length} low` : ""}
                      {bespokeProducts.length ? `${outOfStock.length || lowStock.length ? " · " : ""}${bespokeProducts.length} bespoke` : ""}
                      {!outOfStock.length && !lowStock.length && !bespokeProducts.length ? "Healthy" : ""}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </section>

          {/* Stat cards: row 1 = New orders + Total products; row 2 = Active promotions + Consultations */}
          <section className="min-w-0 sm:col-span-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {stats.slice(1).map((item) => (
                <div
                  key={item.name}
                  className="group rounded-3xl border border-[#b6b7ba]/70 bg-white p-5 shadow-[0_14px_40px_rgba(28,30,34,0.08)] transition hover:bg-[#f5f1eb]"
                >
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="flex w-full items-start justify-between gap-4 text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1c1e22]/60">
                        {item.name}
                      </p>
                      <p className="mt-2 text-3xl font-semibold tracking-tight text-[#1c1e22]">
                        {item.stat}
                      </p>
                    </div>
                    <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-[#b6b7ba]/45 text-[#1c1e22] ring-1 ring-[#b6b7ba]/80">
                      <item.icon className="h-5 w-5" aria-hidden="true" />
                      {item.badge !== undefined ? (
                        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-[#1c1e22] ring-2 ring-[#f5f1eb]">
                          {item.badge}
                        </span>
                      ) : null}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Recent orders */}
          <section className="min-w-0 sm:col-span-7">
            <div className="rounded-3xl border border-[#b6b7ba]/70 bg-white p-5 shadow-[0_14px_40px_rgba(28,30,34,0.08)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-[#1c1e22]">Recent orders</h3>
                  <p className="mt-1 text-sm text-[#1c1e22]/60">Newest orders first.</p>
                </div>
                <Link
                  href="/orders"
                  className="inline-flex items-center gap-2 rounded-full border border-[#b6b7ba]/80 bg-[#f5f1eb] px-4 py-2 text-sm font-semibold text-[#1c1e22]/90 transition hover:bg-[#ebe8e2]"
                >
                  View all
                  <ExternalLink className="h-4 w-4 text-[#1c1e22]/70" />
                </Link>
              </div>

              <div className="mt-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search orders…"
                    className="w-full rounded-2xl border border-[#b6b7ba]/70 bg-[#f5f1eb] px-4 py-3 text-sm text-[#1c1e22]/90 placeholder:text-[#1c1e22]/40 outline-none ring-0 focus:border-[#1c1e22]/30"
                    onChange={() => {}}
                  />
                </div>
              </div>

              <div className="mt-4">
                {recentOrders.length === 0 ? (
                  <div className="rounded-2xl border border-[#b6b7ba]/70 bg-[#f5f1eb] p-6 text-center text-sm text-[#1c1e22]/70">
                    No orders yet.
                  </div>
                ) : (
                  <ul className="divide-y divide-white/10">
                    {recentOrders.map((order) => (
                      <li key={order.id} className="flex items-center justify-between gap-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-[#1c1e22]/60">
                            {formatOrderNumber(order)}
                          </p>
                          <p className="truncate text-sm font-semibold text-[#1c1e22]">
                            {order.customerName}
                          </p>
                          <p className="text-xs text-[#1c1e22]/50">{formatOrderPlacedAt(order.createdAt)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <p className="text-sm font-semibold text-[#1c1e22]">
                            GHC {order.total.toLocaleString()}
                          </p>
                          <div className="flex gap-2">
                            {order.paymentStatus === "unpaid" ? (
                              <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400">
                                Unpaid
                              </span>
                            ) : (
                              <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-400">
                                Paid
                              </span>
                            )}
                            <span className="rounded-full border border-[#b6b7ba]/70 bg-[#f5f1eb] px-2.5 py-1 text-xs font-semibold text-[#1c1e22]/70 capitalize">
                              {order.status}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          {/* Inventory + promotions */}
          <section className="min-w-0 sm:col-span-5">
            <div className="space-y-5">

              <div className="rounded-3xl border border-[#b6b7ba]/70 bg-white p-5 shadow-[0_14px_40px_rgba(28,30,34,0.08)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-[#1c1e22]">Promotions</h3>
                    <p className="mt-1 text-sm text-[#1c1e22]/60">Active codes right now.</p>
                  </div>
                  <Link
                    href="/promotions"
                    className="inline-flex items-center gap-2 rounded-full border border-[#b6b7ba]/80 bg-[#f5f1eb] px-4 py-2 text-sm font-semibold text-[#1c1e22]/90 transition hover:bg-[#ebe8e2]"
                  >
                    Open
                    <ExternalLink className="h-4 w-4 text-[#1c1e22]/70" />
                  </Link>
                </div>

                <div className="mt-4 rounded-2xl border border-[#b6b7ba]/70 bg-[#f5f1eb] p-4">
                  <p className="text-sm text-[#1c1e22]/70">
                    <span className="font-semibold text-[#1c1e22]">{activePromos}</span> active promotion
                    {activePromos === 1 ? "" : "s"}.
                  </p>
                  <p className="mt-1 text-xs text-[#1c1e22]/50">
                    Tap “Open” to create or disable codes.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <RevenueModal
        isOpen={isRevenueModalOpen}
        onClose={() => setIsRevenueModalOpen(false)}
        orders={orders}
        consultations={consultations}
      />

      <InventoryAlertsModal 
        isOpen={isAlertsModalOpen}
        onClose={() => setIsAlertsModalOpen(false)}
        alerts={granularAlerts}
      />
    </div>
  );
}
