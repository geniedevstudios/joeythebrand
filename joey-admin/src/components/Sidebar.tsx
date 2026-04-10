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
        className={`group flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          isActive ? "bg-white/15 text-white" : "text-zinc-200 hover:bg-white/10 hover:text-white"
        }`}
      >
        <div className="flex items-center">
          <item.icon
            className={`mr-3 h-5 w-5 flex-shrink-0 ${
              isActive ? "text-white" : "text-zinc-300 group-hover:text-white"
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
  };

  return (
    <div className="flex h-full w-64 flex-col bg-[#616f84] text-white">
      <div className="flex h-16 items-center px-6 border-b border-white/10">
        <span className="text-lg font-bold tracking-widest">JOEY ADMIN</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {mainNav.map(renderLink)}
        <div className="px-3 pt-5 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
          Site
        </div>
        {contentNav.map(renderLink)}
      </nav>
      <div className="p-4 border-t border-white/10">
        <div className="text-xs text-white/50">Joey The Brand Admin Portal v1.0</div>
      </div>
    </div>
  );
}
