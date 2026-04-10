"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Scrolls to `#id` when landing on `/` with a hash (e.g. from `/booking` → `/#about`). */
export default function HashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") return;
    const id = window.location.hash.replace(/^#/, "");
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    const t = window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
    return () => window.clearTimeout(t);
  }, [pathname]);

  return null;
}
