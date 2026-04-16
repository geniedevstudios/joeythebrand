/** Shop category slug; must match a row in `collections` (see admin Products → Collections). */
export type Category = string;

/** Storefront wear filter; unisex appears under both men’s and women’s. */
export type WearTag = "mens" | "womens" | "unisex";

export interface Collection {
  id: string;
  slug: string;
  name: string;
  /** Shown on home, shop filters, and collection hero. */
  briefDescription: string;
  /** Full story on /collection/[slug]. */
  description: string;
  image?: string;
  hoverImage?: string;
  /** Shown on /collection/[slug] above the wear filter (same layout as event galleries). */
  galleryUrls: string[];
  sortOrder: number;
  createdAt: string;
}

export interface ProductSize {
  name: string;
  available: boolean;
}

export interface Product {
  id: string;
  name: string;
  category: Category;
  categoryName: string;
  price: number;
  originalPrice?: number;
  image: string;
  /** Optional; used as hover image on storefront product cards. */
  hoverImage?: string;
  images: string[];
  description: string;
  details: string[];
  sizes: ProductSize[];
  isOutOfStock: boolean;
  isLimited: boolean;
  isBestSeller: boolean;
  featured: boolean;
  wearTag: WearTag;
  quantity: number;
}

export interface PromotionCode {
  id: string;
  code: string;
  percentage: number;
  active: boolean;
  expiresAt?: string;
}

export interface Order {
  id: string;
  /** Human-readable ref (e.g. JY-000421); empty until DB migration applied. */
  orderNumber?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  items: OrderItem[];
  total: number;
  discount: number;
  promotionCode?: string;
  status: OrderStatus;
  userId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  size: string;
  price: number;
  quantity: number;
  image: string;
}

export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";

/** Bespoke / consultation request lifecycle (admin confirms or declines). */
export type ConsultationStatus = "pending" | "confirmed" | "declined";

export type ConsultationSource = "shop" | "portfolio";

export interface ConsultationBooking {
  id: string;
  /** Shop bookings are tied to auth.users; portfolio (UR site) submissions have no user. */
  userId: string | null;
  source: ConsultationSource;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  service: string;
  preferredDate?: string;
  notes?: string;
  status: ConsultationStatus;
  bookingCode?: string;
  scheduledAt?: string;
  durationHours?: number;
  priceGhs?: number;
  paymentStatus: string;
  paymentRef?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultationSettings {
  maxSlotsPerDay: number;
}

export type PageHeroKey =
  | "home"
  | "shop"
  | "story"
  | "bespoke"
  | "contact"
  | "wishlist"
  | "cart"
  | "collection"
  | "checkout"
  | "account"
  | "shipping"
  | "privacy"
  | "login"
  | "product";

export type PageHeroFit = "cover" | "contain";

export type PageHeroAnchor = "top" | "center" | "bottom";

export type PageHeroMedia =
  | { kind: "image"; src: string; fit?: PageHeroFit; anchor?: PageHeroAnchor }
  | { kind: "video"; src: string; fit?: PageHeroFit; anchor?: PageHeroAnchor };

export interface SiteContent {
  heroImage: string;
  heroTitle: string;
  heroSubtitle: string;
  aboutImage: string;
  aboutText: string;
  featuredProductIds: string[];
  pageHeroes: Record<PageHeroKey, PageHeroMedia>;
}
