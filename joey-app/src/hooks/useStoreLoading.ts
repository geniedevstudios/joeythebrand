import { useSyncExternalStore } from "react";
import { dataStore } from "@/lib/dataStore";

// Stable server snapshot — always `false` so SSR never blocks.
const _serverIsInitializing = () => false;

/**
 * Returns `true` while the dataStore is still performing its initial Supabase
 * fetch. Flips to `false` once `init()` resolves or rejects.
 *
 * Use this in any component that reads from the dataStore to distinguish
 * "data is loading" from "data is genuinely empty / not found".
 *
 * NOTE: `dataStore.isInitializing` is already a stable function reference
 * (defined on the dataStore object), so it's safe to pass directly.
 */
export function useStoreLoading(): boolean {
  return useSyncExternalStore(
    dataStore.subscribe,
    dataStore.isInitializing,
    _serverIsInitializing,
  );
}
