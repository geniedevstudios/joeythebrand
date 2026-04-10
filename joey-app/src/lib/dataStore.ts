import type {
  Product,
  PromotionCode,
  Order,
  SiteContent,
  ProductSize,
  OrderStatus,
  PublicCollection,
  WearTag,
  ConsultationBooking,
  ConsultationStatus,
} from "./types";
import { supabase } from "./supabase";
import { DEFAULT_PAGE_HEROES, siteContentWithPageHeroes } from "./pageHeroes";

/** Used before hydration and when the collections query fails or returns no rows. */
export const SHOP_COLLECTIONS_FALLBACK: PublicCollection[] = [
  {
    id: "fallback-1",
    slug: "always-lit",
    name: "Always Lit",
    description: "Available every season",
    sortOrder: 1,
  },
  {
    id: "fallback-2",
    slug: "limited-edition",
    name: "Limited Edition",
    description: "Limited runs and archive pieces",
    sortOrder: 2,
  },
  {
    id: "fallback-3",
    slug: "sample-sale",
    name: "Sample Sale",
    description: "Samples and specials",
    sortOrder: 3,
  },
];

function normalizeWearTag(v: unknown): WearTag {
  if (v === "mens" || v === "womens" || v === "unisex") return v;
  return "unisex";
}

export function mapPublicCollectionFromSupabaseRow(row: Record<string, unknown>): PublicCollection {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    description: (row.description as string) || "",
    image: (row.image as string) || undefined,
    hoverImage: (row.hover_image as string) || undefined,
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
  heroImage: "/hero.png",
  heroTitle: "JOEY THE BRAND",
  heroSubtitle: "Contemporary fashion redefining modern silhouettes",
  aboutImage: "/founder.png",
  aboutText: "JOEY THE BRAND is a contemporary fashion house redefining modern silhouettes through structure, symbolism, and unapologetic identity.",
  featuredProductIds: ["structured-blazer", "presence-set"],
  pageHeroes: DEFAULT_PAGE_HEROES,
};

/** True after the first `site_content` fetch attempt in `init()` (success or fail). Used to avoid hero flash before client cache is filled. */
let siteContentRemoteResolved = false;

// ─── Row mappers ──────────────────────────────────────────────────────────────

const mapProduct = (row: Record<string, unknown>): Product => ({
  id: row.id as string,
  name: row.name as string,
  category: row.category as Product["category"],
  categoryName: row.category_name as string,
  price: Number(row.price),
  originalPrice: row.original_price != null ? Number(row.original_price) : undefined,
  image: row.image as string,
  hoverImage: (row.hover_image as string) || undefined,
  images: (row.images as string[]) || [],
  description: row.description as string,
  details: (row.details as string[]) || [],
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

  /** Whether client `init()` has finished loading `site_content` (avoids hero flash when SSR already sent real URLs). */
  hasRemoteSiteContentResolved: () => siteContentRemoteResolved,

  // ── Async: initialise cache from Supabase ──────────────────────────────────
  init: async () => {
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
      const { data: sc } = await supabase
        .from("site_content")
        .select("*")
        .single();

      if (sc) {
        siteContent = mapSiteContent(sc as Record<string, unknown>);
      }
    } catch {
      // fall back to default
    } finally {
      siteContentRemoteResolved = true;
      dataStore.notify();
    }
  },

  /** Re-fetch site content from Supabase (heroes, copy, etc.). Call after admin edits or on navigation so the cache stays fresh. */
  refreshSiteContent: async () => {
    try {
      const { data: sc } = await supabase
        .from("site_content")
        .select("*")
        .single();

      if (sc) {
        siteContent = mapSiteContent(sc as Record<string, unknown>);
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
    notes?: string;
  }): Promise<ConsultationBooking> => {
    const preferred =
      input.preferredDate && input.preferredDate.trim() !== ""
        ? input.preferredDate.trim().slice(0, 10)
        : null;

    const { data, error } = await supabase
      .from("consultation_bookings")
      .insert({
        user_id: input.userId,
        customer_name: input.customerName.trim(),
        customer_email: input.customerEmail.trim(),
        customer_phone: input.customerPhone.trim(),
        service: input.service.trim(),
        preferred_date: preferred,
        notes: input.notes?.trim() ? input.notes.trim() : null,
        status: "pending" satisfies ConsultationStatus,
      })
      .select()
      .single();

    if (error) {
      const msg = error.message || "";
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
