"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingBag, Image as ImageIcon, Tag, ShoppingCart } from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Products", href: "/products", icon: ShoppingBag },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Promotions", href: "/promotions", icon: Tag },
  { name: "Site Content", href: "/content", icon: ImageIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-[#616f84] text-white">
      <div className="flex h-16 items-center px-6 border-b border-white/10">
        <span className="text-lg font-bold tracking-widest">JOEY ADMIN</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? "bg-white/15 text-white" : "text-zinc-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              <item.icon
                className={`mr-3 h-5 w-5 flex-shrink-0 ${
                  isActive ? "text-white" : "text-zinc-300 group-hover:text-white"
                }`}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/10">
        <div className="text-xs text-white/50">Joey The Brand Admin Portal v1.0</div>
      </div>
    </div>
  );
}
