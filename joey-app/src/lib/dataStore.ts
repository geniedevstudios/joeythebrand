import {
  type Product,
  type PromotionCode,
  type Order,
  type SiteContent,
  type ProductSize,
  type OrderStatus,
  type PublicCollection,
  type WearTag,
  type ConsultationBooking,
  type ConsultationStatus,
  type NewsSpotlightItem,
  type PromotionPopupConfig,
  type PromotionPopupAction,
  DEFAULT_PROMOTION_POPUP,
} from "./types";
import { supabase } from "./supabase";
import { DEFAULT_PAGE_HEROES, siteContentWithPageHeroes } from "./pageHeroes";

/**
 * In-repo collection stubs for SSR / empty Supabase — not product images.
 * Keeps shop/collection UIs stable until live rows load (see isFallback in CollectionsSection).
 */
export const SHOP_COLLECTIONS_FALLBACK: PublicCollection[] = [
  {
    id: "fallback-1",
    slug: "always-lit",
    name: "Always Lit",
    briefDescription: "Available every season",
    description: "Available every season — signature pieces you can wear year round.",
    sortOrder: 1,
  },
  {
    id: "fallback-2",
    slug: "limited-edition",
    name: "Limited Edition",
    briefDescription: "Limited runs and archive pieces",
    description: "Small-batch drops and archive silhouettes. When they are gone, they are gone.",
    sortOrder: 2,
  },
  {
    id: "fallback-3",
    slug: "sample-sale",
    name: "Sample Sale",
    briefDescription: "Samples and specials",
    description: "One-off samples, experiments, and special pricing while supplies last.",
    sortOrder: 3,
  },
];

function normalizeWearTag(v: unknown): WearTag {
  if (v === "mens" || v === "womens" || v === "unisex") return v;
  return "unisex";
}

export function mapPublicCollectionFromSupabaseRow(row: Record<string, unknown>): PublicCollection {
  const detailed = (row.description as string) || "";
  const briefRaw =
    row.brief_description != null ? String(row.brief_description).trim() : "";
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    briefDescription: briefRaw,
    description: detailed,
    image: (row.image as string) || undefined,
    hoverImage: (row.hover_image as string) || undefined,
    galleryUrls: Array.isArray(row.gallery_urls)
      ? (row.gallery_urls as unknown[]).map((u) => String(u || "").trim()).filter(Boolean)
      : undefined,
    detailWriteup: row.detail_writeup != null ? String(row.detail_writeup) : undefined,
    detailVideoUrl: row.detail_video_url != null ? String(row.detail_video_url) : undefined,
    detailVideoPosterUrl: row.detail_video_poster_url != null ? String(row.detail_video_poster_url) : undefined,
    detailGalleryUrls: Array.isArray(row.detail_gallery_urls)
      ? (row.detail_gallery_urls as unknown[]).map((u) => String(u || "").trim()).filter(Boolean)
      : undefined,
    sortOrder: Number(row.sort_order ?? 0),
  };
}

const mapPublicCollection = mapPublicCollectionFromSupabaseRow;

export const DEFAULT_SIZES: ProductSize[] = [
  { name: "XS", available: true },
  { name: "S", available: true },
  { name: "M", available: true },
  { name: "L", available: true },
  { name: "XL", available: true },
  { name: "Custom", available: true },
];

export const DEFAULT_SITE_CONTENT: SiteContent = {
  heroImage: "",
  heroTitle: "JOEY THE BRAND",
  heroSubtitle: "Contemporary fashion redefining modern silhouettes",
  aboutImage: "/founder.png",
  aboutText: "JOEY THE BRAND is a contemporary fashion house redefining modern silhouettes through structure, symbolism, and unapologetic identity.",
  featuredProductIds: ["structured-blazer", "presence-set"],
  pageHeroes: DEFAULT_PAGE_HEROES,
  founderVideoUrl: "",
  founderVideoPosterUrl: "",
  founderKicker: "BEHIND THE PATTERN",
  founderHeadline: "An intimate look at the craft behind every design.",
  founderCtaLabel: "DISCOVER THE STORY",
  founderCtaHref: "/story",
  newsSpotlights: [],
  promotionPopup: DEFAULT_PROMOTION_POPUP,
};

function inferPromotionPopupMediaKind(url: string, explicit: unknown): PromotionPopupConfig["mediaKind"] {
  if (explicit === "video" || explicit === "image") return explicit;
  const u = url.toLowerCase();
  if (/\.(mp4|webm|mov)(\?|$)/i.test(u)) return "video";
  return "image";
}

function mapPromotionPopupFromRow(raw: unknown): PromotionPopupConfig {
  const base: PromotionPopupConfig = { ...DEFAULT_PROMOTION_POPUP };
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  if (typeof r.enabled === "boolean") base.enabled = r.enabled;
  const mediaUrlRaw =
    typeof r.mediaUrl === "string"
      ? r.mediaUrl.trim()
      : typeof r.media_url === "string"
        ? r.media_url.trim()
        : typeof r.imageUrl === "string"
          ? r.imageUrl.trim()
          : typeof r.image_url === "string"
            ? r.image_url.trim()
            : "";
  if (mediaUrlRaw) base.mediaUrl = mediaUrlRaw;
  const posterRaw =
    typeof r.posterUrl === "string"
      ? r.posterUrl.trim()
      : typeof r.poster_url === "string"
        ? String(r.poster_url).trim()
        : "";
  if (posterRaw) base.posterUrl = posterRaw;
  base.mediaKind = inferPromotionPopupMediaKind(base.mediaUrl, r.mediaKind ?? r.media_kind);
  const headline =
    typeof r.headline === "string"
      ? r.headline.trim()
      : typeof r.title === "string"
        ? r.title.trim()
        : "";
  if (headline) base.headline = headline;
  if (typeof r.body === "string") base.body = r.body;
  const buttonLabelRaw =
    typeof r.buttonLabel === "string"
      ? r.buttonLabel.trim()
      : typeof r.button_label === "string"
        ? String(r.button_label).trim()
        : "";
  if (buttonLabelRaw) base.buttonLabel = buttonLabelRaw;
  const act = r.action;
  const action: PromotionPopupAction =
    act === "newsletter" || act === "product" || act === "news" ? act : base.action;
  base.action = action;
  const slug =
    typeof r.productSlugOrId === "string"
      ? r.productSlugOrId.trim()
      : typeof r.product_slug_or_id === "string"
        ? String(r.product_slug_or_id).trim()
        : "";
  if (slug) base.productSlugOrId = slug;
  return base;
}

function mapNewsSpotlightsFromRow(raw: unknown): NewsSpotlightItem[] {
  if (!Array.isArray(raw)) return [];
  const out: NewsSpotlightItem[] = [];
  for (let i = 0; i < raw.length; i++) {
    const o = raw[i];
    if (!o || typeof o !== "object") continue;
    const r = o as Record<string, unknown>;
    const id = typeof r.id === "string" && r.id.trim() ? r.id.trim() : `news-${i}`;
    const snapshotUrl =
      typeof r.snapshotUrl === "string"
        ? r.snapshotUrl.trim()
        : typeof r.snapshot_url === "string"
          ? r.snapshot_url.trim()
          : "";
    const snapshotKind: "image" | "video" =
      r.snapshotKind === "video" || r.snapshot_kind === "video" ? "video" : "image";
    const destinationUrl =
      typeof r.destinationUrl === "string"
        ? r.destinationUrl.trim()
        : typeof r.destination_url === "string"
          ? r.destination_url.trim()
          : "";
    const title =
      typeof r.title === "string"
        ? r.title.trim()
        : typeof r.headline === "string"
          ? r.headline.trim()
          : "";
    const description = typeof r.description === "string" ? r.description : "";
    const buttonLabelRaw =
      typeof r.buttonLabel === "string"
        ? r.buttonLabel.trim()
        : typeof r.button_label === "string"
          ? String(r.button_label).trim()
          : "";
    const buttonLabel = buttonLabelRaw || "Watch full video";
    if (!snapshotUrl || !destinationUrl) continue;
    out.push({ id, title: title || undefined, snapshotUrl, snapshotKind, destinationUrl, description, buttonLabel });
  }
  return out;
}

/** True after the first `site_content` fetch attempt in `init()` finishes (success or fail). */
let siteContentRemoteResolved = false;
/** True only after we successfully map a `site_content` row into `siteContent` (init or refresh). If init fails, keep using SSR-passed content so we never flash bundled defaults over the server-rendered hero. */
let siteContentAppliedFromRemote = false;

/**
 * True from module load until the very first `init()` completes (success or fail).
 * Used by skeleton loaders to distinguish "still fetching" from "genuinely empty".
 */
let storeInitializing = true;

// ─── Row mappers ──────────────────────────────────────────────────────────────

const mapProduct = (row: Record<string, unknown>): Product => ({
  id: row.id as string,
  slug: (row.slug as string) || undefined,
  name: row.name as string,
  category: row.category as Product["category"],
  categoryName: row.category_name as string,
  price: Number(row.price),
  originalPrice: row.original_price != null ? Number(row.original_price) : undefined,
  image: row.image as string,
  hoverImage: (row.hover_image as string) || undefined,
  images: (row.images as string[]) || [],
  description: row.description as string,
  details: Array.isArray(row.details)
    ? (row.details as string[]).filter((d) => typeof d === "string" && d.trim())
    : [],
  sizes: (row.sizes as ProductSize[]) || DEFAULT_SIZES,
  isOutOfStock: Boolean(row.is_out_of_stock),
  isLimited: Boolean(row.is_limited),
  isBestSeller: Boolean(row.is_best_seller),
  featured: Boolean(row.featured),
  wearTag: normalizeWearTag(row.wear_tag),
  quantity: Number(row.quantity ?? 0),
});

const mapPromo = (row: Record<string, unknown>): PromotionCode => ({
  id: row.id as string,
  code: row.code as string,
  percentage: Number(row.percentage),
  active: Boolean(row.active),
  expiresAt: row.expires_at as string | undefined,
});

export function mapSiteContentFromSupabaseRow(row: Record<string, unknown>): SiteContent {
  const { pageHeroes, heroImage } = siteContentWithPageHeroes(row);
  return {
    heroImage,
    heroTitle: row.hero_title as string,
    heroSubtitle: row.hero_subtitle as string,
    aboutImage: row.about_image as string,
    aboutText: row.about_text as string,
    featuredProductIds: (row.featured_product_ids as string[]) || [],
    pageHeroes,
    founderVideoUrl: row.founder_video_url != null ? String(row.founder_video_url).trim() : "",
    founderVideoPosterUrl: row.founder_video_poster_url != null ? String(row.founder_video_poster_url).trim() : "",
    founderKicker:
      row.founder_kicker != null && String(row.founder_kicker).trim()
        ? String(row.founder_kicker).trim()
        : DEFAULT_SITE_CONTENT.founderKicker,
    founderHeadline:
      row.founder_headline != null && String(row.founder_headline).trim()
        ? String(row.founder_headline).trim()
        : DEFAULT_SITE_CONTENT.founderHeadline,
    founderCtaLabel:
      row.founder_cta_label != null && String(row.founder_cta_label).trim()
        ? String(row.founder_cta_label).trim()
        : DEFAULT_SITE_CONTENT.founderCtaLabel,
    founderCtaHref:
      row.founder_cta_href != null && String(row.founder_cta_href).trim()
        ? String(row.founder_cta_href).trim()
        : DEFAULT_SITE_CONTENT.founderCtaHref,
    newsSpotlights: mapNewsSpotlightsFromRow(row.news_spotlights),
    promotionPopup: mapPromotionPopupFromRow(row.promotion_popup),
  };
}

const mapSiteContent = mapSiteContentFromSupabaseRow;

const mapConsultationBooking = (row: Record<string, unknown>): ConsultationBooking => ({
  id: row.id as string,
  userId: row.user_id as string,
  source: row.source === "portfolio" ? "portfolio" : "shop",
  customerName: row.customer_name as string,
  customerEmail: row.customer_email as string,
  customerPhone: row.customer_phone as string,
  service: row.service as string,
  preferredDate: (row.preferred_date as string) || undefined,
  preferredTime: row.preferred_time != null ? String(row.preferred_time).trim() || undefined : undefined,
  notes: (row.notes as string) || undefined,
  status: row.status as ConsultationStatus,
  bookingCode: row.booking_code
    ? String(row.booking_code).trim() || undefined
    : undefined,
  scheduledAt: (row.scheduled_at as string) || undefined,
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
});

const mapOrder = (row: Record<string, unknown>): Order => ({
  id: row.id as string,
  orderNumber: String(row.order_number ?? "").trim() || undefined,
  customerName: row.customer_name as string,
  customerEmail: row.customer_email as string,
  customerPhone: row.customer_phone as string,
  shippingAddress: row.shipping_address as string,
  items: row.items as Order["items"],
  total: Number(row.total),
  discount: Number(row.discount),
  promotionCode: row.promotion_code as string | undefined,
  paymentStatus: (row.payment_status as "unpaid" | "paid") || "unpaid",
  paymentRef: (row.payment_ref as string) || undefined,
  status: row.status as OrderStatus,
  userId: row.user_id as string | undefined,
  notes: row.notes as string | undefined,
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
});

// ─── Local cache + subscriber pattern (for useSyncExternalStore consumers) ───

let products: Product[] = [];
let collectionsList: PublicCollection[] = SHOP_COLLECTIONS_FALLBACK;
let siteContent: SiteContent = DEFAULT_SITE_CONTENT;
let subscribers: (() => void)[] = [];

// ─── Public API ───────────────────────────────────────────────────────────────

export const dataStore = {
  // Subscriber pattern — sync reads from local cache
  subscribe: (fn: () => void) => {
    subscribers.push(fn);
    return () => { subscribers = subscribers.filter((s) => s !== fn); };
  },
  notify: () => subscribers.forEach((fn) => fn()),

  getProducts: () => products,
  getProduct: (id: string) => products.find((p) => p.id === id),
  getCollections: () => collectionsList,
  getSiteContent: () => siteContent,

  /** Returns true until the first init() attempt finishes. Use this in skeleton loaders. */
  isInitializing: () => storeInitializing,

  hasRemoteSiteContentResolved: () => siteContentRemoteResolved,

  /** Use client `site_content` only after a row was actually applied — avoids replacing SSR heroes with in-memory defaults when the client fetch fails or returns no row. */
  hasAppliedSiteContentFromRemote: () => siteContentAppliedFromRemote,

  // ── Async: initialise cache from Supabase ──────────────────────────────────
  init: async () => {
    // Reset initializing flag so hard-refreshes always show skeleton loaders
    // while the first Supabase fetch is in-flight.
    storeInitializing = true;
    siteContentRemoteResolved = false;
    siteContentAppliedFromRemote = false;
    dataStore.notify();

    try {
      const { data: rows } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: true });

      if (rows) {
        products = rows.map(mapProduct);
        dataStore.notify();
      }
    } catch {
      // silently fall back to empty array
    }

    await dataStore.refreshCollections();

    try {
      const { data: sc, error: scErr } = await supabase
        .from("site_content")
        .select("*")
        .maybeSingle();

      if (!scErr && sc) {
        siteContent = mapSiteContent(sc as Record<string, unknown>);
        siteContentAppliedFromRemote = true;
      }
    } catch {
      // fall back to default
    } finally {
      siteContentRemoteResolved = true;
      storeInitializing = false;
      dataStore.notify();
    }
  },

  /** Re-fetch site content from Supabase (heroes, copy, etc.). Call after admin edits or on navigation so the cache stays fresh. */
  refreshSiteContent: async () => {
    try {
      const { data: sc, error: scErr } = await supabase
        .from("site_content")
        .select("*")
        .maybeSingle();

      if (!scErr && sc) {
        siteContent = mapSiteContent(sc as Record<string, unknown>);
        siteContentAppliedFromRemote = true;
        dataStore.notify();
      }
    } catch {
      // keep existing cache
    }
  },

  /** Re-fetch products from Supabase into the in-memory cache (used by realtime + manual refresh). */
  refreshProducts: async () => {
    try {
      const { data: rows } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: true });
      if (rows) {
        products = rows.map(mapProduct);
        dataStore.notify();
      }
    } catch {
      // keep existing cache
    }
  },

  /** Re-fetch collections for the shop showcase. */
  refreshCollections: async () => {
    try {
      const { data: colRows } = await supabase
        .from("collections")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (colRows && colRows.length > 0) {
        collectionsList = colRows.map((r) => mapPublicCollection(r as Record<string, unknown>));
      } else {
        collectionsList = SHOP_COLLECTIONS_FALLBACK;
      }
      dataStore.notify();
    } catch {
      collectionsList = SHOP_COLLECTIONS_FALLBACK;
      dataStore.notify();
    }
  },

  // ── Async: promo code validation ───────────────────────────────────────────
  validatePromoCode: async (code: string): Promise<PromotionCode | null> => {
    const { data } = await supabase
      .from("promotion_codes")
      .select("*")
      .ilike("code", code.trim())
      .eq("active", true)
      .maybeSingle();

    if (!data) return null;

    const promo = mapPromo(data as Record<string, unknown>);

    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) return null;

    return promo;
  },

  // ── Async: place order ─────────────────────────────────────────────────────
  placeOrder: async (
    order: Omit<Order, "id" | "createdAt" | "updatedAt" | "orderNumber" | "paymentStatus" | "paymentRef">,
  ): Promise<Order> => {
    const { data, error } = await supabase
      .from("orders")
      .insert({
        customer_name: order.customerName,
        customer_email: order.customerEmail,
        customer_phone: order.customerPhone,
        shipping_address: order.shippingAddress,
        items: order.items,
        total: order.total,
        discount: order.discount,
        promotion_code: order.promotionCode ?? null,
        status: order.status,
        payment_status: "unpaid",
        user_id: order.userId ?? null,
        notes: order.notes?.trim() ? order.notes.trim() : null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return mapOrder(data as Record<string, unknown>);
  },

  /** Orders linked to the signed-in customer (requires RLS: user can read own rows). */
  getOrdersForUser: async (userId: string): Promise<Order[]> => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map((row) => mapOrder(row as Record<string, unknown>));
  },

  /** Bespoke / consultation requests for the signed-in customer (RLS: own rows). */
  /**
   * Dates (YYYY-MM-DD) the user cannot pick: their own pending/confirmed days + globally full days.
   * Requires `consultation_availability_for_booking` RPC (see supabase_consultation_calendar.sql).
   */
  getConsultationAvailability: async (
    userId: string,
  ): Promise<{ maxSlotsPerDay: number; disabledDateSet: Set<string> }> => {
    const { data, error } = await supabase.rpc("consultation_availability_for_booking", {
      p_user_id: userId,
      p_days_ahead: 365,
    });
    if (error) throw new Error(error.message);

    const raw = data as {
      maxSlotsPerDay?: number;
      userBlockedDates?: unknown;
      atCapacityDates?: unknown;
    };

    const parseDateArray = (x: unknown): string[] => {
      if (!Array.isArray(x)) return [];
      return x
        .map((v) =>
          typeof v === "string"
            ? v.replace(/^"|"$/g, "").slice(0, 10)
            : String(v).replace(/^"|"$/g, "").slice(0, 10),
        )
        .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s));
    };

    const merged = new Set([
      ...parseDateArray(raw.userBlockedDates),
      ...parseDateArray(raw.atCapacityDates),
    ]);

    const maxSlots = Number(raw.maxSlotsPerDay);
    return {
      maxSlotsPerDay: Number.isFinite(maxSlots) && maxSlots >= 1 ? maxSlots : 5,
      disabledDateSet: merged,
    };
  },

  getConsultationBookingsForUser: async (userId: string): Promise<ConsultationBooking[]> => {
    const { data, error } = await supabase
      .from("consultation_bookings")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map((row) => mapConsultationBooking(row as Record<string, unknown>));
  },

  createConsultationBooking: async (input: {
    userId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    service: string;
    preferredDate?: string;
    preferredTime?: string;
    notes?: string;
  }): Promise<ConsultationBooking> => {
    const preferred =
      input.preferredDate && input.preferredDate.trim() !== ""
        ? input.preferredDate.trim().slice(0, 10)
        : null;
    const preferredTime =
      input.preferredTime && input.preferredTime.trim() !== "" ? input.preferredTime.trim() : null;

    // Downpayment flow (Paystack): the booking is created in "pending" status, but
    // only becomes calendar-blocking once payment_status is marked "paid"
    // (see supabase_consultation_calendar.sql).
    const BESPOKE_DOWNPAYMENT_GHS = 1110;

    const { data, error } = await supabase
      .from("consultation_bookings")
      .insert({
        user_id: input.userId,
        customer_name: input.customerName.trim(),
        customer_email: input.customerEmail.trim(),
        customer_phone: input.customerPhone.trim(),
        service: input.service.trim(),
        preferred_date: preferred,
        preferred_time: preferredTime,
        notes: input.notes?.trim() ? input.notes.trim() : null,
        status: "pending" satisfies ConsultationStatus,
        price_ghs: BESPOKE_DOWNPAYMENT_GHS,
        payment_status: "pending",
      })
      .select()
      .single();

    if (error) {
      const msg = error.message || "";
      if (/column .*payment_status.*does not exist/i.test(msg) || /column .*price_ghs.*does not exist/i.test(msg)) {
        throw new Error(
          "Consultation payments are not enabled in Supabase. Run `supabase_consultation_payments.sql` in the Supabase SQL Editor, then try again.",
        );
      }
      if (/fully booked|day is fully booked/i.test(msg)) {
        throw new Error("That day is fully booked. Please choose another date.");
      }
      if (/already have a request|duplicate/i.test(msg)) {
        throw new Error("You already have an appointment or request on that day.");
      }
      throw new Error(error.message);
    }
    return mapConsultationBooking(data as Record<string, unknown>);
  },
};
