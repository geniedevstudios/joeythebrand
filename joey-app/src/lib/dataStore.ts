import type { Product, PromotionCode, Order, SiteContent, ProductSize, OrderStatus, Category } from "./types";

export const DEFAULT_SIZES: ProductSize[] = [
  { name: "XS", available: true },
  { name: "S", available: true },
  { name: "M", available: true },
  { name: "L", available: true },
  { name: "XL", available: true },
  { name: "Custom", available: true },
];

const STORAGE_KEYS = {
  PRODUCTS: "jtb_products",
  PROMOTIONS: "jtb_promotions",
  ORDERS: "jtb_orders",
  SITE_CONTENT: "jtb_site_content",
};

const DEFAULT_PRODUCTS: Product[] = [
  { 
    id: "structured-blazer", 
    name: "The Structured Blazer", 
    category: "always-lit", 
    categoryName: "Always Lit",
    price: 850, 
    image: "/lookbook.png", 
    images: ["/lookbook.png", "/hero.png", "/founder.png", "/lookbook.png"],
    description: "Precision cut, elevated structure. The Structured Blazer commands a room before a single word is spoken. Featuring our signature sharp shoulders and a tailored waist, it's crafted to serve as the ultimate power armor for the modern professional.",
    details: ["100% Premium Wool Blend", "Signature sharp shoulder pads", "Structured darting for a tailored fit", "Dry clean only"],
    sizes: DEFAULT_SIZES,
    isOutOfStock: false,
    isLimited: false,
    isBestSeller: true,
    featured: true,
  },
  { 
    id: "identity-coat", 
    name: "The Identity Coat", 
    category: "limited-edition", 
    categoryName: "Limited Edition",
    price: 1200, 
    image: "/lookbook.png", 
    images: ["/lookbook.png", "/hero.png", "/founder.png"],
    description: "Limited fabric. Will not be remade. The Identity Coat carries cultural weight in every stitch. Sourced from rare deadstock fabric with symbolic embroidery, only 15 pieces of this coat will ever exist.",
    details: ["Heavyweight deadstock fabric", "Hand-embroidered cultural motifs", "Oversized, floor-sweeping silhouette", "Numbered inner label (1 of 15)"],
    sizes: DEFAULT_SIZES,
    isOutOfStock: false,
    isLimited: true,
    isBestSeller: false,
    featured: false,
  },
  { 
    id: "presence-set", 
    name: "The Presence Set", 
    category: "always-lit", 
    categoryName: "Always Lit",
    price: 980, 
    image: "/lookbook.png", 
    images: ["/lookbook.png", "/hero.png", "/founder.png"],
    description: "Two-piece power ensemble. Designed for effortless authority, this matching set combines a draped tunic with sharply pleated trousers. It's the balance of fluidity and structure.",
    details: ["Breathable crepe fabric", "Asymmetric tunic hem", "High-waisted, wide-leg trouser", "Hidden side zip on trousers"],
    sizes: DEFAULT_SIZES,
    isOutOfStock: false,
    isLimited: false,
    isBestSeller: true,
    featured: true,
  },
  { id: "power-shirt", name: "The Power Shirt", category: "always-lit", categoryName: "Always Lit", price: 380, image: "/lookbook.png", images: ["/lookbook.png", "/hero.png"], description: "Clean lines. Bold statement.", details: ["Cotton poplin"], sizes: DEFAULT_SIZES, isOutOfStock: false, isLimited: false, isBestSeller: false, featured: false },
  { id: "symbol-jacket", name: "The Symbol Jacket", category: "limited-edition", categoryName: "Limited Edition", price: 1050, image: "/lookbook.png", images: ["/lookbook.png", "/hero.png"], description: "Cultural symbolism woven in.", details: ["Recycled blend"], sizes: DEFAULT_SIZES, isOutOfStock: false, isLimited: true, isBestSeller: false, featured: false },
  { id: "sample-trouser", name: "Flare Trouser — Sample", category: "sample-sale", categoryName: "Sample Sale", price: 150, originalPrice: 420, image: "/lookbook.png", images: ["/lookbook.png", "/founder.png"], description: "Production sample — never worn.", details: ["Wool blend"], sizes: DEFAULT_SIZES, isOutOfStock: false, isLimited: true, isBestSeller: false, featured: false },
];

const DEFAULT_SITE_CONTENT: SiteContent = {
  heroImage: "/hero.png",
  heroTitle: "JOEY THE BRAND",
  heroSubtitle: "Contemporary fashion redefining modern silhouettes",
  aboutImage: "/founder.png",
  aboutText: "JOEY THE BRAND is a contemporary fashion house redefining modern silhouettes through structure, symbolism, and unapologetic identity.",
  featuredProductIds: ["structured-blazer", "presence-set"],
};

const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === "undefined") return defaultValue;
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return defaultValue;
    }
  }
  return defaultValue;
};

const saveToStorage = <T>(key: string, value: T): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
};

let products: Product[] = [];
let promotions: PromotionCode[] = [];
let orders: Order[] = [];
let siteContent: SiteContent = DEFAULT_SITE_CONTENT;
let subscribers: (() => void)[] = [];

const initializeData = () => {
  products = loadFromStorage(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
  promotions = loadFromStorage(STORAGE_KEYS.PROMOTIONS, []);
  orders = loadFromStorage(STORAGE_KEYS.ORDERS, []);
  siteContent = loadFromStorage(STORAGE_KEYS.SITE_CONTENT, DEFAULT_SITE_CONTENT);
};

if (typeof window !== "undefined") {
  initializeData();
}

export const dataStore = {
  subscribe: (fn: () => void) => {
    subscribers.push(fn);
    return () => {
      subscribers = subscribers.filter((s) => s !== fn);
    };
  },
  notify: () => subscribers.forEach((fn) => fn()),

  // Products
  getProducts: () => products,
  
  getProduct: (id: string) => products.find((p) => p.id === id),
  
  updateProduct: (id: string, updates: Partial<Product>) => {
    const index = products.findIndex((p) => p.id === id);
    if (index > -1) {
      products = [...products];
      products[index] = { ...products[index], ...updates };
      saveToStorage(STORAGE_KEYS.PRODUCTS, products);
      dataStore.notify();
    }
  },

  updateProductSizes: (id: string, sizes: ProductSize[]) => {
    const index = products.findIndex((p) => p.id === id);
    if (index > -1) {
      products = [...products];
      products[index] = { ...products[index], sizes };
      saveToStorage(STORAGE_KEYS.PRODUCTS, products);
      dataStore.notify();
    }
  },

  addProduct: (product: Omit<Product, "id">) => {
    const newProduct: Product = {
      ...product,
      id: `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    products = [...products, newProduct];
    saveToStorage(STORAGE_KEYS.PRODUCTS, products);
    dataStore.notify();
  },

  deleteProduct: (id: string) => {
    products = products.filter((p) => p.id !== id);
    saveToStorage(STORAGE_KEYS.PRODUCTS, products);
    dataStore.notify();
  },

  // Promotions
  getPromotions: () => promotions,

  getPromotion: (code: string) => {
    return promotions.find((p) => p.code.toUpperCase() === code.toUpperCase() && p.active);
  },

  addPromotion: (promotion: Omit<PromotionCode, "id">) => {
    const newPromotion: PromotionCode = {
      ...promotion,
      id: `promo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    promotions = [...promotions, newPromotion];
    saveToStorage(STORAGE_KEYS.PROMOTIONS, promotions);
    dataStore.notify();
  },

  updatePromotion: (id: string, updates: Partial<PromotionCode>) => {
    const index = promotions.findIndex((p) => p.id === id);
    if (index > -1) {
      promotions = [...promotions];
      promotions[index] = { ...promotions[index], ...updates };
      saveToStorage(STORAGE_KEYS.PROMOTIONS, promotions);
      dataStore.notify();
    }
  },

  deletePromotion: (id: string) => {
    promotions = promotions.filter((p) => p.id !== id);
    saveToStorage(STORAGE_KEYS.PROMOTIONS, promotions);
    dataStore.notify();
  },

  // Orders
  getOrders: () => orders,

  getOrder: (id: string) => orders.find((o) => o.id === id),

  addOrder: (order: Omit<Order, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    const newOrder: Order = {
      ...order,
      id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };
    orders = [...orders, newOrder];
    saveToStorage(STORAGE_KEYS.ORDERS, orders);
    dataStore.notify();
  },

  updateOrderStatus: (id: string, status: OrderStatus) => {
    const index = orders.findIndex((o) => o.id === id);
    if (index > -1) {
      orders = [...orders];
      orders[index] = { 
        ...orders[index], 
        status,
        updatedAt: new Date().toISOString(),
      };
      saveToStorage(STORAGE_KEYS.ORDERS, orders);
      dataStore.notify();
    }
  },

  // Site Content
  getSiteContent: () => siteContent,

  updateSiteContent: (updates: Partial<SiteContent>) => {
    siteContent = { ...siteContent, ...updates };
    saveToStorage(STORAGE_KEYS.SITE_CONTENT, siteContent);
    dataStore.notify();
  },
};
