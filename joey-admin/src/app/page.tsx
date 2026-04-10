"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { dataStore } from "@/lib/dataStore";
import { formatOrderNumber } from "@/lib/formatOrderNumber";
import { formatOrderPlacedAt } from "@/lib/formatOrderPlacedAt";
import type { Product, Order, PromotionCode, ConsultationBooking } from "@/lib/types";
import { ShoppingBag, ShoppingCart, Tag, ExternalLink } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import RevenueModal from "@/components/RevenueModal";

/** Ghana cedi (₵) — Lucide has no cedi glyph */
function CediIcon({ className }: { className?: string }) {
  return (
    <span className={`flex items-center justify-center ${className ?? ""}`} aria-hidden>
      <span className="text-[1.15rem] font-bold leading-none tracking-tight">₵</span>
    </span>
  );
}

type StatCard = {
  name: string;
  stat: string;
  icon: LucideIcon | typeof CediIcon;
};

export default function Dashboard() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [promotions, setPromotions] = useState<PromotionCode[]>([]);
  const [consultations, setConsultations] = useState<ConsultationBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);

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

  const orderRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const consultationRevenue = consultations
    .filter((c) => c.paymentStatus === "paid")
    .reduce((sum, c) => sum + (c.priceGhs || 0), 0);

  const totalRevenue = orderRevenue + consultationRevenue;
  const activePromos = promotions.filter((p) => p.active).length;
  const processingOrdersCount = orders.filter((o) => o.status === "processing").length;

  const stats = [
    { 
      name: "Total Revenue", 
      stat: `GHC ${totalRevenue.toLocaleString()}`, 
      icon: CediIcon,
      clickable: true,
      onClick: () => setIsRevenueModalOpen(true)
    },
    { 
      name: "Total Orders", 
      stat: orders.length.toString(), 
      icon: ShoppingCart,
      clickable: true,
      onClick: () => router.push("/orders"),
      badge: processingOrdersCount > 0 ? processingOrdersCount : undefined
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
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-neutral-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Dashboard Summary</h1>
        <p className="mt-2 text-sm text-neutral-600">Overview of your store&apos;s performance and catalog.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div 
            key={item.name} 
            className={`overflow-hidden rounded-xl bg-white text-zinc-900 shadow-sm border border-zinc-100 transition-all ${
              item.clickable ? "cursor-pointer hover:border-zinc-300 hover:shadow-md active:scale-[0.98]" : ""
            }`}
            onClick={item.onClick}
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-zinc-950 p-3 rounded-lg relative">
                  <item.icon className="h-5 w-5 text-white" aria-hidden="true" />
                  {item.badge !== undefined && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white animate-in zoom-in duration-300">
                      {item.badge}
                    </span>
                  )}
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <dt className="truncate text-sm font-medium text-neutral-600">{item.name}</dt>
                      {item.clickable && <ExternalLink className="h-3 w-3 text-neutral-400" />}
                    </div>
                    <dd className="text-2xl font-semibold tracking-tight text-zinc-900">{item.stat}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <RevenueModal
        isOpen={isRevenueModalOpen}
        onClose={() => setIsRevenueModalOpen(false)}
        orders={orders}
        consultations={consultations}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white shadow-sm border border-zinc-100 flex flex-col">
          <div className="border-b border-zinc-100 px-6 py-5">
            <h3 className="text-base font-semibold leading-6 text-zinc-900">Recent Orders</h3>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center items-center text-center text-neutral-600 text-sm">
            {orders.length === 0 ? (
              <>
                <ShoppingCart className="h-10 w-10 text-zinc-300 mb-3" />
                <p>No orders yet.</p>
              </>
            ) : (
              <ul className="w-full text-left divide-y divide-zinc-100">
                {orders.slice(0, 5).map((order) => (
                  <li key={order.id} className="py-3 flex justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                        {formatOrderNumber(order)}
                      </p>
                      <p className="font-medium text-zinc-900">{order.customerName}</p>
                      <p className="text-xs text-neutral-600">{formatOrderPlacedAt(order.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">GHC {order.total.toLocaleString()}</p>
                      <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 capitalize">
                        {order.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <Link href="/orders" className="text-sm font-semibold text-zinc-950 hover:underline">
                View all orders &rarr;
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white shadow-sm border border-zinc-100 flex flex-col">
          <div className="border-b border-zinc-100 px-6 py-5">
            <h3 className="text-base font-semibold leading-6 text-zinc-900">Inventory Alerts</h3>
          </div>
          <div className="p-6 flex-1 text-sm">
            <div className="space-y-3">
              {(() => {
                const outOfStock = products.filter((p) => p.quantity <= 0);
                const lowStock = products.filter((p) => p.quantity > 0 && p.quantity < 5);

                if (outOfStock.length === 0 && lowStock.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <div className="text-emerald-500 mb-2">
                        <svg className="w-8 h-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-neutral-500">All products are healthy and in stock.</p>
                    </div>
                  );
                }

                return (
                  <>
                    {outOfStock.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-3.5 rounded-xl bg-red-50/50 border border-red-100/50 group hover:bg-red-50 transition-colors">
                        <div className="flex items-center">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600 mr-3">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-zinc-900">{p.name}</p>
                            <p className="text-xs text-red-700/70 font-medium">Out of stock</p>
                          </div>
                        </div>
                        <Link href="/products" className="text-[11px] font-bold uppercase tracking-wider text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          Restock
                        </Link>
                      </div>
                    ))}
                    {lowStock.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50/50 border border-amber-100/50 group hover:bg-amber-50 transition-colors">
                        <div className="flex items-center">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600 mr-3">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-semibold text-zinc-900">{p.name}</p>
                            <p className="text-xs text-amber-700/70 font-medium italic">getting finished ({p.quantity} left)</p>
                          </div>
                        </div>
                        <Link href="/products" className="text-[11px] font-bold uppercase tracking-wider text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          Refill
                        </Link>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
            <div className="mt-6">
              <Link href="/products" className="text-sm font-semibold text-zinc-950 hover:underline">
                Manage products &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
