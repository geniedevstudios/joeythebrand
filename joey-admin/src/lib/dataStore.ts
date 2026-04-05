import type {
  Product,
  PromotionCode,
  Order,
  SiteContent,
  ProductSize,
  OrderStatus,
  Collection,
  WearTag,
  ConsultationBooking,
  ConsultationStatus,
  ConsultationSettings,
} from "./types";
import { supabase } from "./supabase";
import { siteContentWithPageHeroes } from "./pageHeroes";

function normalizeWearTag(v: unknown): WearTag {
  if (v === "mens" || v === "womens" || v === "unisex") return v;
  return "unisex";
}

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
  sizes: (row.sizes as ProductSize[]) || [],
  isOutOfStock: Boolean(row.is_out_of_stock),
  isLimited: Boolean(row.is_limited),
  isBestSeller: Boolean(row.is_best_seller),
  featured: Boolean(row.featured),
  wearTag: normalizeWearTag(row.wear_tag),
});

const mapPromo = (row: Record<string, unknown>): PromotionCode => ({
  id: row.id as string,
  code: row.code as string,
  percentage: Number(row.percentage),
  active: Boolean(row.active),
  expiresAt: row.expires_at as string | undefined,
});

const mapConsultationBooking = (row: Record<string, unknown>): ConsultationBooking => ({
  id: row.id as string,
  userId: row.user_id != null ? (row.user_id as string) : null,
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
  status: row.status as OrderStatus,
  userId: row.user_id as string | undefined,
  notes: row.notes as string | undefined,
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
});

const mapCollection = (row: Record<string, unknown>): Collection => ({
  id: row.id as string,
  slug: row.slug as string,
  name: row.name as string,
  description: (row.description as string) || "",
  sortOrder: Number(row.sort_order ?? 0),
  createdAt: row.created_at as string,
});

const mapSiteContent = (row: Record<string, unknown>): SiteContent => {
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
};

// ─── Subscriber pattern (for admin components that use useEffect + setState) ──

let subscribers: (() => void)[] = [];

export const dataStore = {
  subscribe: (fn: () => void) => {
    subscribers.push(fn);
    return () => { subscribers = subscribers.filter((s) => s !== fn); };
  },
  notify: () => subscribers.forEach((fn) => fn()),

  // ── Collections (product categories / shop filters) ─────────────────────────
  getCollections: async (): Promise<Collection[]> => {
    const { data, error } = await supabase
      .from("collections")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []).map(mapCollection);
  },

  addCollection: async (c: Omit<Collection, "id" | "createdAt">): Promise<void> => {
    const { error } = await supabase.from("collections").insert({
      slug: c.slug.trim().toLowerCase(),
      name: c.name.trim(),
      description: c.description.trim(),
      sort_order: c.sortOrder,
    });
    if (error) throw new Error(error.message);
    dataStore.notify();
  },

  updateCollection: async (
    id: string,
    updates: Partial<Pick<Collection, "name" | "description" | "sortOrder">>,
  ): Promise<void> => {
    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.description !== undefined) payload.description = updates.description.trim();
    if (updates.sortOrder !== undefined) payload.sort_order = updates.sortOrder;
    const { error } = await supabase.from("collections").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    dataStore.notify();
  },

  deleteCollection: async (id: string, slug: string): Promise<void> => {
    const { count, error: countErr } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category", slug);
    if (countErr) throw new Error(countErr.message);
    if ((count ?? 0) > 0) {
      throw new Error("Cannot delete a collection that still has products. Reassign or remove those products first.");
    }
    const { error } = await supabase.from("collections").delete().eq("id", id);
    if (error) throw new Error(error.message);
    dataStore.notify();
  },

  // ── Products ───────────────────────────────────────────────────────────────
  getProducts: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []).map(mapProduct);
  },

  getProduct: async (id: string): Promise<Product | null> => {
    const { data } = await supabase.from("products").select("*").eq("id", id).single();
    return data ? mapProduct(data as Record<string, unknown>) : null;
  },

  updateProduct: async (id: string, updates: Partial<Product>): Promise<void> => {
    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.categoryName !== undefined) payload.category_name = updates.categoryName;
    if (updates.price !== undefined) payload.price = updates.price;
    if (updates.originalPrice !== undefined) payload.original_price = updates.originalPrice;
    if (updates.image !== undefined) payload.image = updates.image;
    if (updates.hoverImage !== undefined) {
      const h = typeof updates.hoverImage === "string" ? updates.hoverImage.trim() : "";
      payload.hover_image = h || null;
    }
    if (updates.images !== undefined) payload.images = updates.images;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.details !== undefined) payload.details = updates.details;
    if (updates.sizes !== undefined) payload.sizes = updates.sizes;
    if (updates.isOutOfStock !== undefined) payload.is_out_of_stock = updates.isOutOfStock;
    if (updates.isLimited !== undefined) payload.is_limited = updates.isLimited;
    if (updates.isBestSeller !== undefined) payload.is_best_seller = updates.isBestSeller;
    if (updates.featured !== undefined) payload.featured = updates.featured;
    if (updates.wearTag !== undefined) payload.wear_tag = updates.wearTag;

    const { error } = await supabase.from("products").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    dataStore.notify();
  },

  addProduct: async (product: Omit<Product, "id"> & { id?: string }): Promise<void> => {
    const id = product.id || `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const { error } = await supabase.from("products").insert({
      id,
      name: product.name,
      category: product.category,
      category_name: product.categoryName,
      price: product.price,
      original_price: product.originalPrice ?? null,
      image: product.image,
      hover_image: product.hoverImage?.trim() || null,
      images: product.images,
      description: product.description,
      details: product.details,
      sizes: product.sizes,
      is_out_of_stock: product.isOutOfStock,
      is_limited: product.isLimited,
      is_best_seller: product.isBestSeller,
      featured: product.featured,
      wear_tag: product.wearTag ?? "unisex",
    });
    if (error) throw new Error(error.message);
    dataStore.notify();
  },

  deleteProduct: async (id: string): Promise<void> => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw new Error(error.message);
    dataStore.notify();
  },

  // ── Promotions ─────────────────────────────────────────────────────────────
  getPromotions: async (): Promise<PromotionCode[]> => {
    const { data, error } = await supabase
      .from("promotion_codes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(mapPromo);
  },

  addPromotion: async (promo: Omit<PromotionCode, "id">): Promise<void> => {
    const { error } = await supabase.from("promotion_codes").insert({
      code: promo.code.toUpperCase(),
      percentage: promo.percentage,
      active: promo.active,
      expires_at: promo.expiresAt ?? null,
    });
    if (error) {
      if (error.code === "23505" || /promotion_codes_code_key/i.test(error.message)) {
        throw new Error("That discount code already exists. Use a different code.");
      }
      throw new Error(error.message);
    }
    dataStore.notify();
  },

  updatePromotion: async (id: string, updates: Partial<PromotionCode>): Promise<void> => {
    const payload: Record<string, unknown> = {};
    if (updates.code !== undefined) payload.code = updates.code;
    if (updates.percentage !== undefined) payload.percentage = updates.percentage;
    if (updates.active !== undefined) payload.active = updates.active;
    if (updates.expiresAt !== undefined) payload.expires_at = updates.expiresAt;

    const { error } = await supabase.from("promotion_codes").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    dataStore.notify();
  },

  deletePromotion: async (id: string): Promise<void> => {
    const { error } = await supabase.from("promotion_codes").delete().eq("id", id);
    if (error) throw new Error(error.message);
    dataStore.notify();
  },

  // ── Orders ─────────────────────────────────────────────────────────────────
  getOrders: async (): Promise<Order[]> => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(mapOrder);
  },

  updateOrderStatus: async (id: string, status: OrderStatus): Promise<void> => {
    const { error } = await supabase
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    dataStore.notify();
  },

  // ── Site Content ───────────────────────────────────────────────────────────
  getSiteContent: async (): Promise<SiteContent> => {
    const { data, error } = await supabase.from("site_content").select("*").single();
    if (error) throw new Error(error.message);
    return mapSiteContent(data as Record<string, unknown>);
  },

  updateSiteContent: async (updates: Partial<SiteContent>): Promise<void> => {
    const payload: Record<string, unknown> = { id: 1 };
    if (updates.heroImage !== undefined) payload.hero_image = updates.heroImage;
    if (updates.heroTitle !== undefined) payload.hero_title = updates.heroTitle;
    if (updates.heroSubtitle !== undefined) payload.hero_subtitle = updates.heroSubtitle;
    if (updates.aboutImage !== undefined) payload.about_image = updates.aboutImage;
    if (updates.aboutText !== undefined) payload.about_text = updates.aboutText;
    if (updates.featuredProductIds !== undefined) payload.featured_product_ids = updates.featuredProductIds;
    if (updates.pageHeroes !== undefined) payload.page_heroes = updates.pageHeroes;

    const { error } = await supabase.from("site_content").upsert(payload);
    if (error) throw new Error(error.message);
    dataStore.notify();
  },

  // ── Consultation / bespoke bookings ───────────────────────────────────────
  getConsultationBookings: async (): Promise<ConsultationBooking[]> => {
    const { data, error } = await supabase
      .from("consultation_bookings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map((row) => mapConsultationBooking(row as Record<string, unknown>));
  },

  getConsultationSettings: async (): Promise<ConsultationSettings> => {
    const { data, error } = await supabase
      .from("consultation_settings")
      .select("max_slots_per_day")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const n = Number((data as { max_slots_per_day?: number } | null)?.max_slots_per_day);
    return { maxSlotsPerDay: Number.isFinite(n) && n >= 1 ? n : 5 };
  },

  updateConsultationSettings: async (maxSlotsPerDay: number): Promise<void> => {
    const n = Math.min(50, Math.max(1, Math.floor(maxSlotsPerDay)));
    const { error } = await supabase
      .from("consultation_settings")
      .upsert({ id: 1, max_slots_per_day: n });
    if (error) throw new Error(error.message);
    dataStore.notify();
  },

  confirmConsultation: async (id: string, scheduledAtIso: string): Promise<void> => {
    const { error } = await supabase
      .from("consultation_bookings")
      .update({
        status: "confirmed" satisfies ConsultationStatus,
        scheduled_at: scheduledAtIso,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
    dataStore.notify();
  },

  declineConsultation: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from("consultation_bookings")
      .update({
        status: "declined" satisfies ConsultationStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
    dataStore.notify();
  },
};
