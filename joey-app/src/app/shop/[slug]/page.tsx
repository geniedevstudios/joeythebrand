import type { Metadata } from "next";
import ProductClient from "./ProductClient";
import { supabase } from "@/lib/supabase";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  let productName = slug;
  let productDesc = "";
  let productImage = "";
  let categoryName = "";
  try {
    const { data } = await supabase
      .from("products")
      .select("name, description, image, category_name")
      .or(`slug.eq.${slug},id.eq.${slug}`)
      .maybeSingle();
      
    if (data?.name) {
      productName = data.name;
    }
    if (data?.description) productDesc = String(data.description || "");
    if (data?.image) productImage = String(data.image || "");
    if (data?.category_name) categoryName = String(data.category_name || "");
  } catch {
    // fallback to slug
  }

  const title = `${productName} | Shop`;
  const description =
    productDesc.trim() ||
    (categoryName ? `Shop ${categoryName} by JOEY THE BRAND.` : "Shop custom and ready-to-wear pieces from JOEY THE BRAND.");
  const canonical = `/shop/${encodeURIComponent(slug)}`;
  const image = productImage.trim() || undefined;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${productName} — Shop — JOEY THE BRAND`,
      description,
      type: "website",
      url: canonical,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: `${productName} — Shop`,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  return <ProductClient slug={resolvedParams.slug} />;
}
