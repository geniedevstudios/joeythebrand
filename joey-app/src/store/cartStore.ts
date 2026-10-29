import { supabase } from "@/lib/supabase";
import { authStore } from "./authStore";

export type CartItem = {
  id: string;
  productId: string;
  name: string;
  color?: string;
  colorHex?: string;
  combo?: string;
  size: string;
  fit?: string;
  wearTag?: string;
  price: number;
  image: string;
  image2?: string;
  quantity: number;
  maxStock: number;
  availablePhysicalStock?: number;
  mtoMaxQtyPerOrder?: number;
  canFallbackToMadeToOrder?: boolean;
  fulfillmentChoice?: "ready_to_wear" | "made_to_order";
  isMadeToOrder?: boolean;
  leadDays?: number;
  isBespoke?: boolean;
  bespokeLeadDays?: number;
  weightKg?: number;
  variantId?: string;
  comboId?: string;
};

export type AppliedPromotion = {
  code: string;
  percentage: number;
  discount: number;
};

const STORAGE_KEY = "jtb_cart";
const PROMO_KEY = "jtb_applied_promo";

const loadCart = (): CartItem[] => {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
};

const loadAppliedPromo = (): AppliedPromotion | null => {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(PROMO_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
};

const saveCart = (c: CartItem[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  
  const user = authStore.getUser();
  if (user) {
    supabase.from("carts").upsert({
      user_id: user.id,
      items: c,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' }).then(({ error }) => {
      if (error) console.error("Failed to sync cart to db:", error.message);
    });
  }
};

const saveAppliedPromo = (p: AppliedPromotion | null) => {
  if (typeof window === "undefined") return;
  if (p) {
    localStorage.setItem(PROMO_KEY, JSON.stringify(p));
  } else {
    localStorage.removeItem(PROMO_KEY);
  }
};

let cart: CartItem[] = typeof window !== "undefined" ? loadCart() : [];
let appliedPromo: AppliedPromotion | null = typeof window !== "undefined" ? loadAppliedPromo() : null;
let isOpen = false;
let subscribers: (() => void)[] = [];

if (typeof window !== "undefined") {
  let lastUserId: string | null = null;
  authStore.subscribe(() => {
    const user = authStore.getUser();
    if (user?.id !== lastUserId) {
      if (user) {
        // Logged in - fetch and merge
        supabase.from("carts").select("items").eq("user_id", user.id).maybeSingle().then(({ data, error }) => {
          if (!error) {
            const dbCart: CartItem[] = data?.items || [];
            const localCart = loadCart();
            const mergedById = new Map<string, CartItem>();
            for (const item of dbCart) {
              mergedById.set(item.id, { ...item });
            }
            for (const localItem of localCart) {
              const existing = mergedById.get(localItem.id);
              if (existing) {
                const max = existing.maxStock ?? localItem.maxStock ?? 999;
                existing.quantity = Math.min(
                  max,
                  Math.max(existing.quantity, localItem.quantity),
                );
              } else {
                mergedById.set(localItem.id, { ...localItem });
              }
            }
            cart = [...mergedById.values()];
            saveCart(cart); // push merged back to DB and local
            cartStore.notify();
          }
        });
      } else if (lastUserId !== null) {
        // Logged out
        cart = [];
        appliedPromo = null;
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(PROMO_KEY);
        cartStore.notify();
      }
      lastUserId = user?.id || null;
    }
  });
}

export const cartStore = {
  getCart: () => cart,
  getAppliedPromo: () => appliedPromo,
  getIsOpen: () => isOpen,
  subscribe: (fn: () => void) => {
    subscribers.push(fn);
    return () => {
      subscribers = subscribers.filter((s) => s !== fn);
    };
  },
  notify: () => subscribers.forEach((fn) => fn()),

  toggleCart: (state?: boolean) => {
    isOpen = state !== undefined ? state : !isOpen;
    cartStore.notify();
  },

  addItem: (item: Omit<CartItem, "id">) => {
    const id = `${item.productId}-${item.color || 'none'}-${item.combo || 'none'}-${item.size}${item.fit ? `-${item.fit}` : ""}`;
    const existingIndex = cart.findIndex((i) => i.id === id);
    if (existingIndex > -1) {
      const updatedCart = [...cart];
      const existing = updatedCart[existingIndex];
      const max = existing.maxStock ?? 999;
      
      updatedCart[existingIndex] = {
        ...existing,
        quantity: Math.min(max, existing.quantity + item.quantity),
      };
      cart = updatedCart;
    } else {
      cart = [...cart, { ...item, id }];
    }
    isOpen = true;
    saveCart(cart);
    cartStore.notify();
  },

  updateQuantity: (id: string, delta: number) => {
    const existingIndex = cart.findIndex((i) => i.id === id);
    if (existingIndex > -1) {
      const updatedItem = { ...cart[existingIndex] };
      const max = updatedItem.maxStock ?? 999;
      
      updatedItem.quantity = Math.max(0, Math.min(max, updatedItem.quantity + delta));
      
      if (updatedItem.quantity <= 0) {
        cart = cart.filter((i) => i.id !== id);
      } else {
        const updatedCart = [...cart];
        updatedCart[existingIndex] = updatedItem;
        cart = updatedCart;
      }
      saveCart(cart);
      cartStore.notify();
    }
  },

  removeItem: (id: string) => {
    cart = cart.filter((i) => i.id !== id);
    saveCart(cart);
    cartStore.notify();
  },

  setItemQuantityAndFulfillment: (
    id: string,
    quantity: number,
    fulfillmentChoice: "ready_to_wear" | "made_to_order",
    leadDays?: number,
    maxStock?: number,
  ) => {
    const existingIndex = cart.findIndex((i) => i.id === id);
    if (existingIndex > -1) {
      const updatedCart = [...cart];
      const existing = updatedCart[existingIndex];
      const isMto = fulfillmentChoice === "made_to_order";
      const nextMax =
        maxStock ??
        (isMto
          ? existing.mtoMaxQtyPerOrder ?? 5
          : existing.availablePhysicalStock ?? existing.maxStock ?? 5);
      updatedCart[existingIndex] = {
        ...existing,
        quantity: Math.max(1, Math.min(nextMax, quantity)),
        maxStock: nextMax,
        fulfillmentChoice,
        isMadeToOrder: isMto,
        isBespoke: isMto,
        leadDays: isMto ? leadDays ?? existing.leadDays ?? existing.bespokeLeadDays ?? 14 : existing.leadDays,
        bespokeLeadDays: isMto ? leadDays ?? existing.bespokeLeadDays ?? existing.leadDays ?? 14 : existing.bespokeLeadDays,
      };
      cart = updatedCart;
      saveCart(cart);
      cartStore.notify();
    }
  },

  clearCart: () => {
    cart = [];
    appliedPromo = null;
    saveCart(cart);
    saveAppliedPromo(null);
    cartStore.notify();
  },

  applyPromotion: (code: string, percentage: number) => {
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const discount = Math.round((subtotal * percentage) / 100);
    appliedPromo = { code, percentage, discount };
    saveAppliedPromo(appliedPromo);
    cartStore.notify();
  },

  removePromotion: () => {
    appliedPromo = null;
    saveAppliedPromo(null);
    cartStore.notify();
  },
};
