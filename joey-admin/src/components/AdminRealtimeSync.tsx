"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { dataStore } from "@/lib/dataStore";

const TABLES = [
  "products",
  "orders",
  "collections",
  "promotion_codes",
  "site_content",
  "consultation_bookings",
  "consultation_settings",
] as const;

/**
 * Refetches admin views when Supabase Realtime reports a change.
 * Tables must be added to the `supabase_realtime` publication in the dashboard.
 */
export default function AdminRealtimeSync() {
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;

    const bump = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        t = undefined;
        dataStore.notify();
      }, 150);
    };

    const channel = supabase.channel("admin-dashboard");
    for (const table of TABLES) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, bump);
    }
    channel.subscribe();

    return () => {
      if (t) clearTimeout(t);
      void supabase.removeChannel(channel);
    };
  }, []);

  return null;
}
