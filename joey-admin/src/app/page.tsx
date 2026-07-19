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
  Eye,
  EyeOff,
  Users,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import RevenueModal from "@/components/RevenueModal";
import InventoryAlertsModal, { AlertItem } from "@/components/InventoryAlertsModal";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import { isPrimaryAdminEmail } from "@/lib/adminPrimary";

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
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [profileName, setProfileName] = useState<string>("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [editAdminOpen, setEditAdminOpen] = useState(false);
  type TeamMember = { email: string; userId: string | null; name: string; isPrimary: boolean };
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);
  const [pendingDeleteEmail, setPendingDeleteEmail] = useState<string | null>(null);

  const isPrimaryAdmin = isPrimaryAdminEmail(sessionEmail);

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

    supabase.auth.getUser().then(({ data }) => {
      setProfileName(pickName(data.user));
      setSessionEmail(data.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setProfileName(pickName(session?.user));
      setSessionEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadTeam = useCallback(async () => {
    setTeamLoading(true);
    setTeamError(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Not signed in.");

      const res = await fetch("/api/admin/team", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const out = (await res.json()) as { error?: string; members?: TeamMember[] };
      if (!res.ok) throw new Error(out.error || "Failed to load team");
      setTeamMembers(out.members ?? []);
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : "Failed to load team");
      setTeamMembers([]);
    } finally {
      setTeamLoading(false);
    }
  }, []);

  const handleDeleteAdmin = async (email: string) => {
    setDeletingEmail(email);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Not signed in.");

      const res = await fetch("/api/admin/team", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });
      const out = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(out.error || "Failed to remove");

      toast.success("Admin removed.");
      await loadTeam();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove.");
      throw err;
    } finally {
      setDeletingEmail(null);
      setPendingDeleteEmail(null);
    }
  };

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
      <div className="flex min-h-[calc(100vh-6rem)] w-full min-w-0 items-center justify-center text-white">
        <div className="text-sm text-white/80">Loading dashboard…</div>
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
  const t = todayParts();

  return (
    <div className="min-h-[calc(100vh-6rem)] w-full min-w-0 max-w-none text-white">
      <div className="w-full min-w-0 max-w-none space-y-6">
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

          {isPrimaryAdmin ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditAdminOpen(true);
                  void loadTeam();
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#d6ff2a] px-4 py-2 text-sm font-semibold text-black shadow-[0_10px_30px_rgba(214,255,42,0.18)] transition hover:opacity-95 active:translate-y-[1px]"
              >
                Edit admin
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/10">
                  <Users className="h-4 w-4 text-black/80" strokeWidth={2} />
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCreateUserOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-[#d6ff2a] px-4 py-2 text-sm font-semibold text-black shadow-[0_10px_30px_rgba(214,255,42,0.18)] transition hover:opacity-95 active:translate-y-[1px]"
              >
                Add admin
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/10">
                  +
                </span>
              </button>
            </div>
          ) : null}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Feature card */}
          <section className="min-w-0 lg:col-span-6">
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
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
                      Total orders
                    </p>
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#d6ff2a]/20 text-[#d6ff2a] ring-1 ring-white/10"
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
                      {bespokeProducts.length ? `${outOfStock.length || lowStock.length ? " · " : ""}${bespokeProducts.length} bespoke` : ""}
                      {!outOfStock.length && !lowStock.length && !bespokeProducts.length ? "Healthy" : ""}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </section>

          {/* Stat cards: row 1 = New orders + Total products; row 2 = Active promotions + Consultations */}
          <section className="min-w-0 lg:col-span-6">
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
          <section className="min-w-0 lg:col-span-7">
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
                            <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-xs font-semibold text-white/70 capitalize">
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
          <section className="min-w-0 lg:col-span-5">
            <div className="space-y-5">

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

      <InventoryAlertsModal 
        isOpen={isAlertsModalOpen}
        onClose={() => setIsAlertsModalOpen(false)}
        alerts={granularAlerts}
      />

      {createUserOpen ? (
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/55 p-5 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="Add admin"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setCreateUserOpen(false);
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d10] shadow-[0_26px_90px_rgba(0,0,0,0.55)] ring-1 ring-white/5">
            <div className="border-b border-white/10 px-6 py-5">
              <h2 className="text-lg font-semibold tracking-tight text-white">Add admin</h2>
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
                  const out = (await res.json()) as { error?: string; teamSyncError?: string };
                  if (!res.ok) throw new Error(out.error || "Failed to create user");

                  toast.success("Admin account created.");
                  if (out.teamSyncError) {
                    toast.warning(out.teamSyncError);
                  }
                  setNewUserName("");
                  setNewUserEmail("");
                  setNewUserPassword("");
                  setShowNewUserPassword(false);
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
                <div className="relative mt-2">
                  <input
                    type={showNewUserPassword ? "text" : "password"}
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-4 pr-12 text-sm text-white/90 placeholder:text-white/40 outline-none focus:border-[#d6ff2a]/50 focus:ring-2 focus:ring-[#d6ff2a]/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewUserPassword((v) => !v)}
                    aria-label={showNewUserPassword ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-white/55 transition hover:bg-white/[0.06] hover:text-white/90"
                  >
                    {showNewUserPassword ? <EyeOff className="h-5 w-5" strokeWidth={2} /> : <Eye className="h-5 w-5" strokeWidth={2} />}
                  </button>
                </div>
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
                  {creatingUser ? "Creating…" : "Create admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editAdminOpen ? (
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/55 p-5 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="Manage dashboard admins"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditAdminOpen(false);
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d10] shadow-[0_26px_90px_rgba(0,0,0,0.55)] ring-1 ring-white/5">
            <div className="border-b border-white/10 px-6 py-5">
              <h2 className="text-lg font-semibold tracking-tight text-white">Dashboard admins</h2>
              <p className="mt-1 text-sm text-white/60">
                Operators listed here can access the admin dashboard (same list as database access). Remove someone to revoke their access.
              </p>
            </div>
            <div className="max-h-[min(60vh,420px)] overflow-y-auto px-6 py-4">
              {teamLoading ? (
                <p className="text-sm text-white/60">Loading…</p>
              ) : teamError ? (
                <p className="text-sm text-red-300/90">{teamError}</p>
              ) : teamMembers.length === 0 ? (
                <p className="text-sm text-white/60">No operators found.</p>
              ) : (
                <ul className="space-y-2">
                  {teamMembers.map((m) => (
                    <li
                      key={m.email}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-white">{m.name}</div>
                        <div className="truncate text-xs text-white/55">{m.email}</div>
                        {m.isPrimary ? (
                          <span className="mt-1 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">
                            Primary
                          </span>
                        ) : null}
                      </div>
                      {m.isPrimary ? (
                        <span className="shrink-0 text-xs text-white/40">—</span>
                      ) : (
                        <button
                          type="button"
                          disabled={deletingEmail === m.email}
                          onClick={() => setPendingDeleteEmail(m.email)}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                          {deletingEmail === m.email ? "Removing…" : "Remove"}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-white/10 px-6 py-4">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                <button
                  type="button"
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/[0.06]"
                  onClick={() => setEditAdminOpen(false)}
                  disabled={!!deletingEmail}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10"
                  onClick={() => void loadTeam()}
                  disabled={teamLoading || !!deletingEmail}
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingDeleteEmail !== null}
        title="Remove admin?"
        description={
          pendingDeleteEmail ? (
            <>
              Remove <span className="font-medium text-zinc-900">{pendingDeleteEmail}</span> from dashboard access? Their login will be deleted if an account exists. This cannot be undone.
            </>
          ) : undefined
        }
        confirmLabel="Remove admin"
        variant="danger"
        onCancel={() => setPendingDeleteEmail(null)}
        onConfirm={async () => {
          if (pendingDeleteEmail) await handleDeleteAdmin(pendingDeleteEmail);
        }}
      />
    </div>
  );
}
