"use client";
import { useEffect } from "react";
import { dataStore } from "@/lib/dataStore";
import { subscribeShopPublicRealtime } from "@/lib/supabasePublicRealtime";

/**
 * Initialises the dataStore cache from Supabase on app load, and keeps
 * `site_content` (hero images, copy) fresh on navigation and when returning to the tab.
 */
export default function DataStoreInit() {
  useEffect(() => {
    void dataStore.init();
  }, []);

  useEffect(() => {
    return subscribeShopPublicRealtime();
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void dataStore.refreshSiteContent();
        void dataStore.refreshCollections();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return null;
}
