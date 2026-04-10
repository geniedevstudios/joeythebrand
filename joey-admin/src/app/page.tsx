"use client";

import { useEffect, useState, useCallback } from "react";
import { dataStore } from "@/lib/dataStore";
import { formatOrderNumber } from "@/lib/formatOrderNumber";
import { formatOrderPlacedAt } from "@/lib/formatOrderPlacedAt";
import type { Product, Order, PromotionCode } from "@/lib/types";
import { ShoppingBag, ShoppingCart, Tag } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

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
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [promotions, setPromotions] = useState<PromotionCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [p, o, pr] = await Promise.all([
        dataStore.getProducts(),
        dataStore.getOrders(),
        dataStore.getPromotions(),
      ]);
      setProducts(p);
      setOrders(o);
      setPromotions(pr);
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

  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const activePromos = promotions.filter((p) => p.active).length;

  const stats: StatCard[] = [
    { name: "Total Revenue", stat: `GHC ${totalRevenue.toLocaleString()}`, icon: CediIcon },
    { name: "Total Orders", stat: orders.length.toString(), icon: ShoppingCart },
    { name: "Total Products", stat: products.length.toString(), icon: ShoppingBag },
    { name: "Active Promotions", stat: activePromos.toString(), icon: Tag },
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
          <div key={item.name} className="overflow-hidden rounded-xl bg-white text-zinc-900 shadow-sm border border-zinc-100">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-zinc-950 p-3 rounded-lg">
                  <item.icon className="h-5 w-5 text-white" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-neutral-600">{item.name}</dt>
                    <dd className="text-2xl font-semibold tracking-tight text-zinc-900">{item.stat}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

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
            <ul className="space-y-4">
              {products.filter((p) => p.isOutOfStock).length > 0 ? (
                products.filter((p) => p.isOutOfStock).map((p) => (
                  <li key={p.id} className="flex items-center text-red-600">
                    <span className="h-2 w-2 bg-red-600 rounded-full mr-3"></span>
                    {p.name} is marked as out of stock.
                  </li>
                ))
              ) : (
                <li className="text-neutral-600">All products are currently in stock.</li>
              )}
            </ul>
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
