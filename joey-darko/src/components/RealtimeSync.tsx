"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RealtimeSync() {
  const router = useRouter();

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;

    const bump = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        t = undefined;
        // Refresh Next.js server component data
        router.refresh();
        // Dispatch custom global event for purely client-side fetchers
        window.dispatchEvent(new Event("joeyydarko-refresh"));
      }, 150);
    };

    // Subscribing to secure public table for Realtime bumps (avoids exposing RLS row payloads)
    const channel = supabase.channel("portfolio-realtime");
    channel.on("postgres_changes", { event: "*", schema: "public", table: "portfolio_realtime_bumps" }, bump);
    channel.subscribe();

    return () => {
      if (t) clearTimeout(t);
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
