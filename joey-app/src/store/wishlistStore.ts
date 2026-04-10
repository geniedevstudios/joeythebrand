export type WishlistItem = {
  id: string;
  name: string;
  price: string;
  image: string;
  category: string;
};

const STORAGE_KEY = "jtb_wishlist";

const loadWishlist = (): WishlistItem[] => {
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

const saveWishlist = (items: WishlistItem[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

let items: WishlistItem[] = typeof window !== "undefined" ? loadWishlist() : [];
let subscribers: (() => void)[] = [];

export const wishlistStore = {
  getItems: () => items,
  subscribe: (fn: () => void) => {
    subscribers.push(fn);
    return () => { subscribers = subscribers.filter((s) => s !== fn); };
  },
  notify: () => subscribers.forEach((fn) => fn()),

  addItem: (item: WishlistItem) => {
    if (!items.find((i) => i.id === item.id)) {
      items = [...items, item];
      saveWishlist(items);
      wishlistStore.notify();
    }
  },

  removeItem: (id: string) => {
    items = items.filter((i) => i.id !== id);
    saveWishlist(items);
    wishlistStore.notify();
  },

  toggleItem: (item: WishlistItem) => {
    if (items.find((i) => i.id === item.id)) {
      items = items.filter((i) => i.id !== item.id);
    } else {
      items = [...items, item];
    }
    saveWishlist(items);
    wishlistStore.notify();
  },

  has: (id: string) => items.some((i) => i.id === id),
};
