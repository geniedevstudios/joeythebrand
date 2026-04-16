"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { dataStore } from "@/lib/dataStore";
import {
  LayoutDashboard,
  ShoppingBag,
  ImageIcon,
  Tag,
  ShoppingCart,
  CalendarDays,
  Mail,
  FileText,
  Minus,
  Plus,
} from "lucide-react";

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
};

const mainNav: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Products", href: "/products", icon: ShoppingBag },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Promotions", href: "/promotions", icon: Tag },
];

const contentNav: NavItem[] = [
  { name: "Site Content", href: "/content", icon: ImageIcon },
  { name: "App pages", href: "/content/app-pages", icon: FileText },
  { name: "Consultations", href: "/content/consultations", icon: CalendarDays },
  { name: "Newsletter", href: "/content/newsletter", icon: Mail },
];

function linkActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/content") return pathname === "/content";
  if (href === "/content/newsletter") return pathname.startsWith("/content/newsletter");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const [processingOrdersCount, setProcessingOrdersCount] = useState(0);
  const [pendingConsultationsCount, setPendingConsultationsCount] = useState(0);
  const [contentExpanded, setContentExpanded] = useState(true);

  const fetchCounts = async () => {
    try {
      const [orders, consultations] = await Promise.all([
        dataStore.getOrders(),
        dataStore.getConsultationBookings(),
      ]);
      
      const ordersCount = orders.filter((o) => o.status === "processing").length;
      const consultationsCount = consultations.filter((c) => c.status === "pending").length;
      
      setProcessingOrdersCount(ordersCount);
      setPendingConsultationsCount(consultationsCount);
    } catch (err) {
      console.error("Sidebar counts fetch error:", err);
    }
  };

  useEffect(() => {
    fetchCounts();
    const unsubscribe = dataStore.subscribe(fetchCounts);
    return unsubscribe;
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("joeyAdmin.sidebar.contentExpanded");
      if (raw === "0") setContentExpanded(false);
      if (raw === "1") setContentExpanded(true);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("joeyAdmin.sidebar.contentExpanded", contentExpanded ? "1" : "0");
    } catch {
      // ignore
    }
  }, [contentExpanded]);

  const renderLink = (item: NavItem) => {
    const isActive = linkActive(pathname, item.href);
    let badgeCount = item.badge;
    
    if (item.href === "/orders") {
      badgeCount = processingOrdersCount;
    } else if (item.href === "/content/consultations") {
      badgeCount = pendingConsultationsCount;
    }

    return (
      <Link
        key={item.name}
        href={item.href}
        className={`group flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
          isActive
            ? "bg-[#d6ff2a] text-black shadow-[0_12px_30px_rgba(214,255,42,0.16)]"
            : "text-white/80 hover:bg-white/5 hover:text-white"
        }`}
      >
        <div className="flex items-center">
          <item.icon
            className={`mr-3 h-5 w-5 flex-shrink-0 ${
              isActive ? "text-black" : "text-white/70 group-hover:text-white"
            }`}
            aria-hidden="true"
          />
          {item.name}
        </div>
        {badgeCount !== undefined && badgeCount > 0 && (
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shadow-sm ring-1 ${
              isActive ? "bg-black/80 text-white ring-black/20" : "bg-red-600 text-white ring-white/20"
            }`}
          >
            {badgeCount}
          </span>
        )}
      </Link>
    );
  };

  const isContentActive =
    pathname === "/content" ||
    pathname.startsWith("/content/consultations") ||
    pathname.startsWith("/content/newsletter") ||
    pathname.startsWith("/content/app-pages");

  return (
    <div className="flex h-full w-72 flex-col bg-[#0b0d10] text-white">
      <div className="flex h-16 items-center gap-3 px-6 border-b border-white/10">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
          <span className="text-sm font-bold tracking-tight text-white">J</span>
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-wide text-white">JOEY ADMIN</div>
          <div className="truncate text-[11px] font-medium text-white/55">Management portal</div>
        </div>
      </div>
      <nav className="flex-1 space-y-2 px-4 py-4">
        {mainNav.map(renderLink)}
        <div className="px-2 pt-5 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
          Site
        </div>
        <div
          className={`group flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
            isContentActive ? "bg-white/6 text-white" : "text-white/80 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Link href="/content" className="flex min-w-0 flex-1 items-center">
            <ImageIcon
              className={`mr-3 h-5 w-5 flex-shrink-0 ${
                isContentActive ? "text-white" : "text-white/70 group-hover:text-white"
              }`}
              aria-hidden="true"
            />
            <span className="truncate">Site Content</span>
          </Link>
          <button
            type="button"
            onClick={() => setContentExpanded((v) => !v)}
            className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-xl text-white/70 hover:bg-white/5 hover:text-white"
            aria-label={contentExpanded ? "Collapse site content links" : "Expand site content links"}
            aria-expanded={contentExpanded}
          >
            {contentExpanded ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>

        {contentExpanded ? (
          <div className="ml-6 mt-1 space-y-1 border-l border-white/10 pl-3">
            {contentNav
              .filter((i) => i.href !== "/content")
              .map((item) => {
                const isActive = linkActive(pathname, item.href);
                let badgeCount = item.badge;
                if (item.href === "/content/consultations") badgeCount = pendingConsultationsCount;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center justify-between rounded-2xl px-3 py-2 text-[13px] font-semibold transition-colors ${
                      isActive ? "bg-white/6 text-white" : "text-white/75 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center">
                      <item.icon
                        className={`mr-2 h-4 w-4 flex-shrink-0 ${
                          isActive ? "text-white" : "text-white/65 group-hover:text-white"
                        }`}
                        aria-hidden="true"
                      />
                      {item.name}
                    </div>
                    {badgeCount !== undefined && badgeCount > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm ring-1 ring-white/20">
                        {badgeCount}
                      </span>
                    )}
                  </Link>
                );
              })}
          </div>
        ) : null}
      </nav>
      <div className="p-4 border-t border-white/10">
        <div className="text-xs text-white/55">Joey The Brand Admin Portal</div>
      </div>
    </div>
  );
}
