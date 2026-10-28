import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import BespokeClient from "./BespokeClient";
import { fetchSiteContentForHome } from "@/lib/fetchSiteContentServer";
import { DEFAULT_SITE_CONTENT } from "@/lib/dataStore";
import { isCuratedBespokeMtoProduct, resolveProductFulfillmentMode } from "@/lib/variantUtils";
import type { Product, ProductSize, WearTag } from "@/lib/types";

export const metadata: Metadata = {
  title: "Bespoke & Made to Order",
  description:
    "Book a bespoke or styling consultation with JOEY THE BRAND, or explore curated Made to Order pieces handcrafted for you.",
};

export const dynamic = "force-dynamic";

function normalizeWearTag(raw: unknown): WearTag {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (s === "mens" || s === "womens" || s === "unisex") return s;
  return "unisex";
}

async function fetchCuratedMtoProductsServer(): Promise<Product[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return [];
  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: rows } = await supabase
      .from("products")
      .select("*")
      .eq("fulfillment_mode", "made_to_order_only")
      .eq("show_on_bespoke_page", true)
      .order("created_at", { ascending: true });
    if (!rows) return [];
    const mapped: Product[] = rows.map((row: Record<string, unknown>) => {
      const fulfillmentMode = resolveProductFulfillmentMode(row);
      const leadDays = Number(row.made_to_order_lead_days ?? row.bespoke_lead_days ?? 14);
      return {
        id: row.id as string,
        slug: (row.slug as string) || undefined,
        name: row.name as string,
        category: row.category as string,
        categoryName: (row.category_name as string) || "",
        price: Number(row.price),
        originalPrice: row.original_price != null ? Number(row.original_price) : undefined,
        image: row.image as string,
        hoverImage: (row.hover_image as string) || undefined,
        images: (row.images as string[]) || [],
        description: (row.description as string) || "",
        details: Array.isArray(row.details) ? (row.details as string[]) : [],
        sizes: (row.sizes as ProductSize[]) || [],
        isOutOfStock: Boolean(row.is_out_of_stock),
        isLimited: Boolean(row.is_limited),
        isBestSeller: Boolean(row.is_best_seller),
        featured: Boolean(row.featured),
        wearTag: normalizeWearTag(row.wear_tag),
        quantity: Number(row.quantity ?? 0),
        isPublished: row.is_published !== false,
        fulfillmentMode,
        showOnBespokePage:
          fulfillmentMode === "made_to_order_only" && Boolean(row.show_on_bespoke_page),
        madeToOrderLeadDays: leadDays,
        mtoMaxQtyPerOrder: Math.max(1, Number(row.mto_max_qty_per_order ?? 5)),
        bespokeAvailable: fulfillmentMode !== "stock_only",
        bespokeLeadDays: leadDays,
        weightKg: row.weight_kg != null ? Number(row.weight_kg) : undefined,
        hsCode: (row.hs_code as string) || undefined,
        variants: (row.variants as any) || [],
      };
    });
    return mapped.filter(isCuratedBespokeMtoProduct);
  } catch {
    return [];
  }
}

export default async function BespokePage() {
  const [initialSiteContent, initialMtoProducts] = await Promise.all([
    fetchSiteContentForHome(),
    fetchCuratedMtoProductsServer(),
  ]);

  return (
    <BespokeClient
      initialSiteContent={initialSiteContent ?? DEFAULT_SITE_CONTENT}
      initialMtoProducts={initialMtoProducts}
    />
  );
}
