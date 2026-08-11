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
  ConsultationDayRule,
  ConsultationStatus,
  ConsultationSettings,
  NewsSpotlightItem,
  PromotionPopupConfig,
  PromotionPopupAction,
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
  sizes: (row.sizes as ProductSize[]) || [],
  isOutOfStock: Boolean(row.is_out_of_stock),
  isLimited: Boolean(row.is_limited),
  isBestSeller: Boolean(row.is_best_seller),
  featured: Boolean(row.featured),
  wearTag: normalizeWearTag(row.wear_tag),
  quantity: Number(row.quantity ?? 0),
  bespokeAvailable: Boolean(row.bespoke_available),
  bespokeLeadDays: Number(row.bespoke_lead_days ?? 14),
  weightKg: row.weight_kg != null ? Number(row.weight_kg) : undefined,
  hsCode: (row.hs_code as string) || undefined,
  variants: (row.variants as any) || [],
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
  preferredTime: row.preferred_time != null ? String(row.preferred_time).trim() || undefined : undefined,
  notes: (row.notes as string) || undefined,
  status: row.status as ConsultationStatus,
  bookingCode: row.booking_code
    ? String(row.booking_code).trim() || undefined
    : undefined,
  scheduledAt: (row.scheduled_at as string) || undefined,
  durationHours: row.duration_hours != null ? Number(row.duration_hours) : undefined,
  priceGhs: row.price_ghs != null ? Number(row.price_ghs) : undefined,
  paymentStatus: (row.payment_status as string) || "unpaid",
  paymentRef: (row.payment_ref as string) || undefined,
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
  dhlTrackingNumber: row.dhl_tracking_number as string | undefined,
  dhlLabelUrl: row.dhl_label_url as string | undefined,
  dhlStatus: row.dhl_status as string | undefined,
  statusHistory: (typeof row.dhl_status === "string" && row.dhl_status.startsWith("[")) 
    ? JSON.parse(row.dhl_status) 
    : [],
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
});

const mapCollection = (row: Record<string, unknown>): Collection => ({
  id: row.id as string,
  slug: row.slug as string,
  name: row.name as string,
  briefDescription: (row.brief_description as string) || "",
  description: (row.description as string) || "",
  image: (row.image as string) || undefined,
  image2: (row.image2 as string) || undefined,
  image3: (row.image3 as string) || undefined,
  galleryUrls: Array.isArray(row.gallery_urls)
    ? (row.gallery_urls as unknown[]).map((u) => String(u || "").trim()).filter(Boolean)
    : [],
  detailWriteup: row.detail_writeup != null ? String(row.detail_writeup) : "",
  detailVideoUrl: row.detail_video_url != null ? String(row.detail_video_url) : "",
  detailVideoPosterUrl: row.detail_video_poster_url != null ? String(row.detail_video_poster_url) : "",
  detailGalleryUrls: Array.isArray(row.detail_gallery_urls)
    ? (row.detail_gallery_urls as unknown[]).map((u) => String(u || "").trim()).filter(Boolean)
    : [],
  sortOrder: Number(row.sort_order ?? 0),
  createdAt: row.created_at as string,
});

const FD = {
  kicker: "BEHIND THE PATTERN",
  headline: "An intimate look at the craft behind every design.",
  ctaLabel: "DISCOVER THE STORY",
  ctaHref: "/story",
};

const DEFAULT_PROMOTION_POPUP_ADMIN: PromotionPopupConfig = {
  id: "",
  enabled: false,
  mediaKind: "image",
  mediaUrl: "",
  posterUrl: "",
  headline: "",
  body: "",
  buttonLabel: "Learn more",
  action: "news",
  productSlugOrId: "",
};

function inferPromotionPopupMediaKind(url: string, explicit: unknown): PromotionPopupConfig["mediaKind"] {
  if (explicit === "video" || explicit === "image") return explicit;
  const u = url.toLowerCase();
  if (/\.(mp4|webm|mov)(\?|$)/i.test(u)) return "video";
  return "image";
}

function mapPromotionPopupFromRow(raw: unknown): PromotionPopupConfig {
  const base: PromotionPopupConfig = { ...DEFAULT_PROMOTION_POPUP_ADMIN };
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
  
  if (typeof r.id === "string" && r.id.trim()) {
    base.id = r.id.trim();
  } else {
    // Generate an ID if it's a legacy object missing one
    base.id = `popup-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
  
  return base;
}

function mapPromotionPopupsFromRow(raw: unknown): PromotionPopupConfig[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map(mapPromotionPopupFromRow).filter(Boolean);
  }
  const single = mapPromotionPopupFromRow(raw);
  // If it's a legacy empty object, don't show it
  if (!single.mediaUrl && !single.headline) return [];
  return [single];
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
    founderVideoUrl: row.founder_video_url != null ? String(row.founder_video_url).trim() : "",
    founderVideoPosterUrl: row.founder_video_poster_url != null ? String(row.founder_video_poster_url).trim() : "",
    founderKicker:
      row.founder_kicker != null && String(row.founder_kicker).trim()
        ? String(row.founder_kicker).trim()
        : FD.kicker,
    founderHeadline:
      row.founder_headline != null && String(row.founder_headline).trim()
        ? String(row.founder_headline).trim()
        : FD.headline,
    founderCtaLabel:
      row.founder_cta_label != null && String(row.founder_cta_label).trim()
        ? String(row.founder_cta_label).trim()
        : FD.ctaLabel,
    founderCtaHref:
      row.founder_cta_href != null && String(row.founder_cta_href).trim()
        ? String(row.founder_cta_href).trim()
        : FD.ctaHref,
    newsSpotlights: mapNewsSpotlightsFromRow(row.news_spotlights),
    promotionPopups: mapPromotionPopupsFromRow(row.promotion_popup),
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
      brief_description: c.briefDescription.trim(),
      description: c.description.trim(),
      image: c.image || null,
      image2: c.image2 || null,
      image3: c.image3 || null,
      gallery_urls: (c.galleryUrls ?? []).map((u) => String(u || "").trim()).filter(Boolean),
      detail_writeup: String(c.detailWriteup ?? "").trim(),
      detail_video_url: String(c.detailVideoUrl ?? "").trim(),
      detail_video_poster_url: String(c.detailVideoPosterUrl ?? "").trim(),
      detail_gallery_urls: (c.detailGalleryUrls ?? []).map((u) => String(u || "").trim()).filter(Boolean),
      sort_order: c.sortOrder,
    });
    if (error) throw new Error(error.message);
    dataStore.notify();
  },

  updateCollection: async (
    id: string,
    updates: Partial<
      Pick<
        Collection,
        | "name"
        | "briefDescription"
        | "description"
        | "sortOrder"
        | "image"
        | "image2"
        | "image3"
        | "galleryUrls"
        | "detailWriteup"
        | "detailVideoUrl"
        | "detailVideoPosterUrl"
        | "detailGalleryUrls"
      >
    >,
  ): Promise<void> => {
    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.briefDescription !== undefined) payload.brief_description = updates.briefDescription.trim();
    if (updates.description !== undefined) payload.description = updates.description.trim();
    if (updates.sortOrder !== undefined) payload.sort_order = updates.sortOrder;
    if (updates.image !== undefined) payload.image = updates.image || null;
    if (updates.image2 !== undefined) payload.image2 = updates.image2 || null;
    if (updates.image3 !== undefined) payload.image3 = updates.image3 || null;
    if (updates.galleryUrls !== undefined) {
      payload.gallery_urls = updates.galleryUrls.map((u) => String(u || "").trim()).filter(Boolean);
    }
    if (updates.detailWriteup !== undefined) payload.detail_writeup = String(updates.detailWriteup ?? "").trim();
    if (updates.detailVideoUrl !== undefined) payload.detail_video_url = String(updates.detailVideoUrl ?? "").trim();
    if (updates.detailVideoPosterUrl !== undefined) {
      payload.detail_video_poster_url = String(updates.detailVideoPosterUrl ?? "").trim();
    }
    if (updates.detailGalleryUrls !== undefined) {
      payload.detail_gallery_urls = updates.detailGalleryUrls.map((u) => String(u || "").trim()).filter(Boolean);
    }

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
    if (updates.slug !== undefined) payload.slug = updates.slug;
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
    if (updates.quantity !== undefined) payload.quantity = updates.quantity;
    if (updates.bespokeAvailable !== undefined) payload.bespoke_available = updates.bespokeAvailable;
    if (updates.bespokeLeadDays !== undefined) payload.bespoke_lead_days = updates.bespokeLeadDays;
    if (updates.weightKg !== undefined) payload.weight_kg = updates.weightKg;
    if (updates.hsCode !== undefined) payload.hs_code = updates.hsCode;
    if (updates.variants !== undefined) payload.variants = updates.variants;

    const { error } = await supabase.from("products").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    dataStore.notify();
  },

  addProduct: async (product: Omit<Product, "id"> & { id?: string }): Promise<void> => {
    const id = product.id || `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const generatedSlug = product.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const slug = product.slug || generatedSlug;
    
    const { error } = await supabase.from("products").insert({
      id,
      slug,
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
      quantity: product.quantity ?? 0,
      bespoke_available: product.bespokeAvailable ?? false,
      bespoke_lead_days: product.bespokeLeadDays ?? 14,
      weight_kg: product.weightKg ?? null,
      hs_code: product.hsCode ?? null,
      variants: product.variants ?? [],
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
    // Fetch the current order to get its dhl_status (where we store history for local orders)
    const { data: currentOrder, error: fetchError } = await supabase
      .from("orders")
      .select("dhl_status, dhl_tracking_number")
      .eq("id", id)
      .single();

    if (fetchError) throw new Error(fetchError.message);

    const payload: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString()
    };

    // If it's a domestic order (no DHL tracking), we store history in dhl_status
    if (!currentOrder.dhl_tracking_number) {
      let history: { status: string; timestamp: string }[] = [];
      if (typeof currentOrder.dhl_status === "string" && currentOrder.dhl_status.startsWith("[")) {
        try {
          history = JSON.parse(currentOrder.dhl_status);
        } catch(e) {}
      }
      history.push({ status, timestamp: new Date().toISOString() });
      payload.dhl_status = JSON.stringify(history);
    }

    const { error } = await supabase
      .from("orders")
      .update(payload)
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
    if (updates.founderVideoUrl !== undefined) payload.founder_video_url = updates.founderVideoUrl;
    if (updates.founderVideoPosterUrl !== undefined) payload.founder_video_poster_url = updates.founderVideoPosterUrl;
    if (updates.founderKicker !== undefined) payload.founder_kicker = updates.founderKicker;
    if (updates.founderHeadline !== undefined) payload.founder_headline = updates.founderHeadline;
    if (updates.founderCtaLabel !== undefined) payload.founder_cta_label = updates.founderCtaLabel;
    if (updates.founderCtaHref !== undefined) payload.founder_cta_href = updates.founderCtaHref;
    if (updates.newsSpotlights !== undefined) payload.news_spotlights = updates.newsSpotlights;
    if (updates.promotionPopups !== undefined) payload.promotion_popup = updates.promotionPopups;

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

  getConsultationDayRules: async (): Promise<ConsultationDayRule[]> => {
    const { data, error } = await supabase
      .from("consultation_day_rules")
      .select("day,max_slots_per_day")
      .order("day", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || [])
      .map((r) => ({
        day: String((r as { day?: string }).day ?? ""),
        maxSlotsPerDay: Number((r as { max_slots_per_day?: number }).max_slots_per_day ?? 5),
      }))
      .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.day));
  },

  upsertConsultationDayRule: async (day: string, maxSlotsPerDay: number): Promise<void> => {
    const d = String(day || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error("Invalid day.");
    const n = Math.min(50, Math.max(1, Math.floor(maxSlotsPerDay)));
    const { error } = await supabase.from("consultation_day_rules").upsert({ day: d, max_slots_per_day: n });
    if (error) throw new Error(error.message);
    dataStore.notify();
  },

  confirmConsultation: async (id: string, scheduledAtIso: string): Promise<void> => {
    const { data: booking, error: fetchErr } = await supabase
      .from("consultation_bookings")
      .select("source")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("consultation_bookings")
      .update({
        status: "confirmed" satisfies ConsultationStatus,
        scheduled_at: scheduledAtIso,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw new Error(error.message);

    try {
      // Determine which storefront to trigger the email from based on the source
      const isPortfolio = booking?.source === "portfolio";
      
      let appUrl;
      if (isPortfolio) {
        appUrl = process.env.NEXT_PUBLIC_PORTFOLIO_URL || "http://localhost:3001";
      } else {
        appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      }

      await fetch(`${appUrl}/api/admin/trigger-consultation-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch (err) {
      console.error("Failed to trigger confirmation email:", err);
    }

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

  updateConsultationPaymentStatus: async (id: string, paymentStatus: string): Promise<void> => {
    const { error } = await supabase
      .from("consultation_bookings")
      .update({
        payment_status: paymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
    dataStore.notify();
  },
};
