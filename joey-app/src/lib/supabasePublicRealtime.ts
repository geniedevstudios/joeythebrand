import { supabase } from "./supabase";
import { dataStore } from "./dataStore";

/**
 * Subscribes to Supabase Realtime for public shop data. Enable replication for these tables
 * in Dashboard → Database → Publications (supabase_realtime).
 */
export function subscribeShopPublicRealtime(): () => void {
  if (typeof window === "undefined") return () => {};

  let t: ReturnType<typeof setTimeout> | undefined;

  const bump = () => {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      t = undefined;
      void Promise.all([
        dataStore.refreshProducts(),
        dataStore.refreshCollections(),
        dataStore.refreshSiteContent(),
      ]);
    }, 120);
  };

  const channel = supabase
    .channel("shop-public-cache")
    .on("postgres_changes", { event: "*", schema: "public", table: "products" }, bump)
    .on("postgres_changes", { event: "*", schema: "public", table: "collections" }, bump)
    .on("postgres_changes", { event: "*", schema: "public", table: "site_content" }, bump)
    .on("postgres_changes", { event: "*", schema: "public", table: "promotion_codes" }, bump)
    .subscribe();

  return () => {
    if (t) clearTimeout(t);
    void supabase.removeChannel(channel);
  };
}
