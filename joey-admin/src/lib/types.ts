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
  image2?: string;
  image3?: string;
  /** Shown on /collection/[slug] above the wear filter (same layout as event galleries). */
  galleryUrls: string[];
  /** Optional write-up shown after the first gallery on /collection/[slug]. */
  detailWriteup?: string;
  /** Optional MP4/WebM URL shown after the write-up on /collection/[slug]. */
  detailVideoUrl?: string;
  /** Optional poster URL used while the video loads. */
  detailVideoPosterUrl?: string;
  /** Optional second gallery shown after the video. */
  detailGalleryUrls?: string[];
  sortOrder: number;
  createdAt: string;
}

export interface ProductSize {
  name: string;
  available: boolean;
}

export type ProductVariantType = "color" | "fit_combo"; // Keeping fit_combo for backwards compatibility with old variants

export interface ProductCombo {
  id: string;
  name: string;
  price: number;
  thumbnailUrl: string;
  images: string[];
  quantity?: number;
  isOutOfStock?: boolean;
  bespokeAvailable?: boolean;
  bespokeLeadDays?: number;
  nameFormat?: "plus" | "brackets";
}

export interface ProductVariant {
  id: string;
  type: ProductVariantType;
  colorHex?: string;
  thumbnailUrl?: string;
  images?: string[];
  name?: string;
  price?: number;
  combos?: ProductCombo[];
  nameFormat?: "plus" | "brackets";
  quantity?: number;
  isOutOfStock?: boolean;
  bespokeAvailable?: boolean;
  bespokeLeadDays?: number;
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
  bespokeAvailable?: boolean;
  bespokeLeadDays?: number;
  weightKg?: number;
  hsCode?: string;
  variants?: ProductVariant[];
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
  dhlTrackingNumber?: string;
  dhlLabelUrl?: string;
  dhlStatus?: string;
  statusHistory?: { status: string; timestamp: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  color?: string;
  colorHex?: string;
  combo?: string;
  size: string;
  fit?: string;
  wearTag?: string;
  price: number;
  quantity: number;
  image: string;
  variantId?: string;
  comboId?: string;
  isBespoke?: boolean;
  bespokeLeadDays?: number;
}

export type OrderStatus = 
  | "pending" 
  | "processing" 
  | "order packaged" 
  | "courier on his way to pick package" 
  | "courier picked package" 
  | "courier on the way to deliver package" 
  | "package delivered" 
  | "shipped" 
  | "delivered" 
  | "cancelled";

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
  preferredTime?: string;
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

export interface ConsultationDayRule {
  /** UTC date bucket (YYYY-MM-DD). */
  day: string;
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
  | "product"
  | "news"
  | "report_issue";

export type PageHeroFit = "cover" | "contain";

export type PageHeroAnchor = "top" | "center" | "bottom";

export type PageHeroMedia =
  | { kind: "image"; src: string; fit?: PageHeroFit; anchor?: PageHeroAnchor }
  | { kind: "video"; src: string; fit?: PageHeroFit; anchor?: PageHeroAnchor };

export type PromotionPopupAction = "newsletter" | "product" | "news";

export type PromotionPopupMediaKind = "image" | "video";

export interface PromotionPopupConfig {
  id: string;
  enabled: boolean;
  mediaKind: PromotionPopupMediaKind;
  mediaUrl: string;
  posterUrl: string;
  headline: string;
  body: string;
  buttonLabel: string;
  action: PromotionPopupAction;
  productSlugOrId: string;
}

export interface NewsSpotlightItem {
  id: string;
  title?: string;
  snapshotUrl: string;
  snapshotKind: "image" | "video";
  destinationUrl: string;
  description: string;
  buttonLabel: string;
}

export interface SiteContent {
  heroImage: string;
  heroTitle: string;
  heroSubtitle: string;
  aboutImage: string;
  aboutText: string;
  featuredProductIds: string[];
  pageHeroes: Record<PageHeroKey, PageHeroMedia>;
  founderVideoUrl: string;
  founderVideoPosterUrl: string;
  founderKicker: string;
  founderHeadline: string;
  founderCtaLabel: string;
  founderCtaHref: string;
  newsSpotlights: NewsSpotlightItem[];
  promotionPopups: PromotionPopupConfig[];
}
