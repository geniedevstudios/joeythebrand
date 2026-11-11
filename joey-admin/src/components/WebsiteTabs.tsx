"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminPillClass, adminPillTrackClass } from "@/lib/adminChrome";

const TABS = [
  { label: "Clan", href: "/users" },
  { label: "Promotions", href: "/promotions" },
  { label: "App pages", href: "/content/app-pages" },
] as const;

function tabActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function WebsiteTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex justify-center">
      <nav aria-label="Website" className={adminPillTrackClass}>
        {TABS.map((tab) => {
          const active = tabActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={adminPillClass(active, "md")}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
