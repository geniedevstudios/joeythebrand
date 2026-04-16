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
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

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

function startOfTodayLabel(): string {
  const d = new Date();
  const day = d.toLocaleDateString(undefined, { day: "2-digit" });
  const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
  const month = d.toLocaleDateString(undefined, { month: "long" });
  return `${day} · ${weekday} · ${month}`;
}

function todayParts(): { day: string; weekday: string; month: string } {
  const d = new Date();
  return {
    day: d.toLocaleDateString(undefined, { day: "2-digit" }),
    weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
    month: d.toLocaleDateString(undefined, { month: "long" }),
  };
}

export default function Dashboard() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [promotions, setPromotions] = useState<PromotionCode[]>([]);
  const [consultations, setConsultations] = useState<ConsultationBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [profileName, setProfileName] = useState<string>("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);

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

  useEffect(() => {
    const pickName = (u: any): string => {
      const email = String(u?.email || "").trim();
      const meta = (u?.user_metadata || {}) as Record<string, unknown>;
      const nameRaw =
        String(meta.full_name || meta.name || meta.display_name || "").trim() ||
        String(meta.first_name || "").trim();
      return nameRaw || (email ? email.split("@")[0] : "Admin");
    };

    supabase.auth.getUser().then(({ data }) => setProfileName(pickName(data.user)));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setProfileName(pickName(session?.user));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

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
      <div className="-m-6 flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#0b0d10] p-6 text-white">
        <div className="text-sm text-white/80">Loading dashboard…</div>
      </div>
    );
  }

  const outOfStock = products.filter((p) => p.quantity <= 0);
  const lowStock = products.filter((p) => p.quantity > 0 && p.quantity < 5);
  const inventoryAlerts = outOfStock.length + lowStock.length;

  const recentOrders = orders.slice(0, 6);
  const t = todayParts();

  return (
    <div className="-m-6 min-h-[calc(100vh-4rem)] bg-[#0b0d10] p-6 text-white">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex min-w-0 flex-wrap items-end gap-5">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-white/55">{profileName || "Admin"},</div>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Welcome back!
              </h1>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-lg font-semibold text-white ring-1 ring-white/10">
                {t.day}
              </div>
              <div className="leading-[1.05]">
                <div className="text-sm font-semibold text-white/70">{t.weekday}</div>
                <div className="text-base font-semibold text-white">{t.month}</div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCreateUserOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-[#d6ff2a] px-4 py-2 text-sm font-semibold text-black shadow-[0_10px_30px_rgba(214,255,42,0.18)] transition hover:opacity-95 active:translate-y-[1px]"
          >
            Add user
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/10">
              +
            </span>
          </button>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Feature card */}
          <section className="lg:col-span-6">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.45)]">
              <div
                className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#d6ff2a]/10 blur-3xl"
                aria-hidden
              />
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
                    Revenue snapshot
                  </p>
                  <h2 className="mt-2 text-4xl font-semibold tracking-tight text-white">
                    {stats[0]?.stat ?? `GHC ${totalRevenue.toLocaleString()}`}
                  </h2>
                  <p className="mt-2 text-sm text-white/70">
                    Total paid revenue (orders + paid consultations).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRevenueModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
                >
                  View
                  <ExternalLink className="h-4 w-4 text-white/70" />
                </button>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/orders")}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:bg-black/30"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
                    Total orders
                  </p>
                  <div className="mt-2 flex items-baseline justify-between gap-3">
                    <p className="text-2xl font-semibold tracking-tight">{orders.length.toLocaleString()}</p>
                    {processingOrdersCount > 0 ? (
                      <span className="rounded-full bg-red-600/90 px-2.5 py-1 text-xs font-bold text-white">
                        {processingOrdersCount} processing
                      </span>
                    ) : null}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/products")}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:bg-black/30"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
                    Inventory alerts
                  </p>
                  <div className="mt-2 flex items-baseline justify-between gap-3">
                    <p className="text-2xl font-semibold tracking-tight">{inventoryAlerts.toLocaleString()}</p>
                    <span className="text-xs font-semibold text-white/60">
                      {outOfStock.length ? `${outOfStock.length} out` : ""}
                      {outOfStock.length && lowStock.length ? " · " : ""}
                      {lowStock.length ? `${lowStock.length} low` : ""}
                      {!outOfStock.length && !lowStock.length ? "Healthy" : ""}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </section>

          {/* Stat cards */}
          <section className="lg:col-span-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {stats.slice(1).map((item) => (
                <div
                  key={item.name}
                  className="group rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.45)] transition hover:bg-white/[0.06]"
                >
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="flex w-full items-start justify-between gap-4 text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
                        {item.name}
                      </p>
                      <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
                        {item.stat}
                      </p>
                    </div>
                    <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-[#d6ff2a]/20 text-[#d6ff2a] ring-1 ring-white/10">
                      <item.icon className="h-5 w-5" aria-hidden="true" />
                      {item.badge !== undefined ? (
                        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-[#0b0d10]">
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
          <section className="lg:col-span-7">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.45)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-white">Recent orders</h3>
                  <p className="mt-1 text-sm text-white/60">Newest orders first.</p>
                </div>
                <Link
                  href="/orders"
                  className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
                >
                  View all
                  <ExternalLink className="h-4 w-4 text-white/70" />
                </Link>
              </div>

              <div className="mt-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search orders…"
                    className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/90 placeholder:text-white/40 outline-none ring-0 focus:border-white/20"
                    onChange={() => {}}
                  />
                </div>
              </div>

              <div className="mt-4">
                {recentOrders.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-center text-sm text-white/70">
                    No orders yet.
                  </div>
                ) : (
                  <ul className="divide-y divide-white/10">
                    {recentOrders.map((order) => (
                      <li key={order.id} className="flex items-center justify-between gap-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
                            {formatOrderNumber(order)}
                          </p>
                          <p className="truncate text-sm font-semibold text-white">
                            {order.customerName}
                          </p>
                          <p className="text-xs text-white/50">{formatOrderPlacedAt(order.createdAt)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <p className="text-sm font-semibold text-white">
                            GHC {order.total.toLocaleString()}
                          </p>
                          <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-xs font-semibold text-white/70 capitalize">
                            {order.status}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          {/* Inventory + promotions */}
          <section className="lg:col-span-5">
            <div className="space-y-5">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.45)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-white">Inventory</h3>
                    <p className="mt-1 text-sm text-white/60">Out of stock & low stock items.</p>
                  </div>
                  <Link
                    href="/products"
                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
                  >
                    Manage
                    <ExternalLink className="h-4 w-4 text-white/70" />
                  </Link>
                </div>

                <div className="mt-4 space-y-3">
                  {inventoryAlerts === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
                      All products are healthy and in stock.
                    </div>
                  ) : (
                    <>
                      {outOfStock.slice(0, 3).map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-2xl border border-red-500/15 bg-red-500/10 p-4"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{p.name}</p>
                            <p className="text-xs font-semibold text-red-200/90">Out of stock</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => router.push("/products")}
                            className="text-xs font-semibold text-red-100/90 hover:underline"
                          >
                            Restock
                          </button>
                        </div>
                      ))}

                      {lowStock.slice(0, 3).map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-2xl border border-amber-500/15 bg-amber-500/10 p-4"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{p.name}</p>
                            <p className="text-xs font-semibold text-amber-100/90">
                              Low stock ({p.quantity} left)
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => router.push("/products")}
                            className="text-xs font-semibold text-amber-100/90 hover:underline"
                          >
                            Refill
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.45)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-white">Promotions</h3>
                    <p className="mt-1 text-sm text-white/60">Active codes right now.</p>
                  </div>
                  <Link
                    href="/promotions"
                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
                  >
                    Open
                    <ExternalLink className="h-4 w-4 text-white/70" />
                  </Link>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm text-white/70">
                    <span className="font-semibold text-white">{activePromos}</span> active promotion
                    {activePromos === 1 ? "" : "s"}.
                  </p>
                  <p className="mt-1 text-xs text-white/50">
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

      {createUserOpen ? (
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/55 p-5 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="Create team member"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setCreateUserOpen(false);
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d10] shadow-[0_26px_90px_rgba(0,0,0,0.55)] ring-1 ring-white/5">
            <div className="border-b border-white/10 px-6 py-5">
              <h2 className="text-lg font-semibold tracking-tight text-white">Add team member</h2>
              <p className="mt-1 text-sm text-white/60">
                Create an email + password that can sign into the admin portal.
              </p>
            </div>
            <form
              className="space-y-4 px-6 py-5"
              onSubmit={async (e) => {
                e.preventDefault();
                const name = newUserName.trim();
                const email = newUserEmail.trim().toLowerCase();
                const password = newUserPassword;
                if (!email || !password) {
                  toast.error("Email and password are required.");
                  return;
                }
                if (password.length < 8) {
                  toast.error("Password must be at least 8 characters.");
                  return;
                }
                setCreatingUser(true);
                try {
                  const { data: sess } = await supabase.auth.getSession();
                  const token = sess.session?.access_token;
                  if (!token) throw new Error("Not signed in.");

                  const res = await fetch("/api/admin/create-user", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ name, email, password }),
                  });
                  const out = await res.json();
                  if (!res.ok) throw new Error(out.error || "Failed to create user");

                  toast.success("Team member created.");
                  setNewUserName("");
                  setNewUserEmail("");
                  setNewUserPassword("");
                  setCreateUserOpen(false);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to create user.");
                } finally {
                  setCreatingUser(false);
                }
              }}
            >
              <div>
                <label className="block text-sm font-semibold text-white/80">Name</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Full name"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/90 placeholder:text-white/40 outline-none focus:border-[#d6ff2a]/50 focus:ring-2 focus:ring-[#d6ff2a]/20"
                />
                <p className="mt-2 text-xs text-white/50">Optional — used for display in the admin header.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-white/80">Email</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="teammate@example.com"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/90 placeholder:text-white/40 outline-none focus:border-[#d6ff2a]/50 focus:ring-2 focus:ring-[#d6ff2a]/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white/80">Password</label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/90 placeholder:text-white/40 outline-none focus:border-[#d6ff2a]/50 focus:ring-2 focus:ring-[#d6ff2a]/20"
                  required
                />
                <p className="mt-2 text-xs text-white/50">
                  Share these credentials securely. The user can sign in at the admin login screen.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-end sm:gap-3">
                <button
                  type="button"
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/[0.06]"
                  onClick={() => setCreateUserOpen(false)}
                  disabled={creatingUser}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="rounded-2xl bg-[#d6ff2a] px-5 py-2.5 text-sm font-semibold text-black shadow-[0_12px_30px_rgba(214,255,42,0.14)] transition hover:opacity-95 disabled:opacity-60"
                >
                  {creatingUser ? "Creating…" : "Create user"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
