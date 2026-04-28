export type Category = string;

/** Shop filter: men's / women's; unisex shows in both. */
export type WearTag = "mens" | "womens" | "unisex";

export interface ProductSize {
  name: string;
  available: boolean;
}

export interface Product {
  id: string;
  slug?: string;
  name: string;
  category: Category;
  categoryName: string;
  price: number;
  originalPrice?: number;
  image: string;
  /** Shown on product cards when the shopper hovers (optional). */
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

/** Collection row for shop showcase (from Supabase). */
export interface PublicCollection {
  id: string;
  slug: string;
  name: string;
  /** Short line for home, /collection index, and collection hero. */
  briefDescription: string;
  /** Long-form copy for the collection detail page body. */
  description: string;
  image?: string;
  hoverImage?: string;
  /** Images above the wear filter on /collection/[slug] (same layout as event galleries). */
  galleryUrls?: string[];
  /** Optional write-up shown after the first gallery. */
  detailWriteup?: string;
  /** Optional MP4/WebM URL shown after the write-up. */
  detailVideoUrl?: string;
  /** Optional poster image URL for the video. */
  detailVideoPosterUrl?: string;
  /** Optional second gallery shown after the video. */
  detailGalleryUrls?: string[];
  sortOrder: number;
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
  /** Human-readable ref from DB (e.g. JY-000421); empty until migration applied. */
  orderNumber?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  items: OrderItem[];
  total: number;
  discount: number;
  promotionCode?: string;
  paymentStatus: "unpaid" | "paid";
  paymentRef?: string;
  status: OrderStatus;
  /** Set when the customer was signed in at checkout (Supabase auth.users id). */
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
  userId: string;
  /** Always `shop` for rows returned to signed-in shop customers. */
  source: ConsultationSource;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  service: string;
  /** ISO date string (YYYY-MM-DD) or undefined if not chosen */
  preferredDate?: string;
  notes?: string;
  status: ConsultationStatus;
  /** Present when admin has confirmed (e.g. BSP-000042). */
  bookingCode?: string;
  /** Admin-set appointment instant (ISO), shown to customer when confirmed. */
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Global cap on confirmed consultations per calendar day (UTC). */
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

/** How the hero fills the banner: cover = fill area (may crop); contain = full image visible (may letterbox). */
export type PageHeroFit = "cover" | "contain";

/** Which part of the image stays in view when cropping (cover) or priority (contain). */
export type PageHeroAnchor = "top" | "center" | "bottom";

/** Home may use video; all other pages use image only in the UI. */
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
  /** Per-route hero backgrounds (and optional home video). */
  pageHeroes: Record<PageHeroKey, PageHeroMedia>;
  /** Home “Behind the pattern” block: background video + copy (admin). */
  founderVideoUrl: string;
  founderVideoPosterUrl: string;
  founderKicker: string;
  founderHeadline: string;
  founderCtaLabel: string;
  founderCtaHref: string;
}
