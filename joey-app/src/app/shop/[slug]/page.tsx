import type { Metadata } from "next";
import ProductClient from "./ProductClient";
import { supabase } from "@/lib/supabase";

const SITE_URL = "https://joeythebrand.com";

function toAbsoluteUrl(url: string): string {
  const u = String(url || "").trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  return `${SITE_URL}${u.startsWith("/") ? "" : "/"}${u}`;
}

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
  const slug = resolvedParams.slug;

  // Server-side JSON-LD for rich results (Product).
  // We fetch a small subset here (independent of the client store) so crawlers get structured data.
  type ProductRow = {
    id?: string | null;
    slug?: string | null;
    name?: string | null;
    description?: string | null;
    image?: string | null;
    price?: number | null;
    quantity?: number | null;
    category_name?: string | null;
  };

  let product: ProductRow | null = null;

  try {
    const { data } = await supabase
      .from("products")
      .select("id, slug, name, description, image, price, quantity, category_name")
      .or(`slug.eq.${slug},id.eq.${slug}`)
      .maybeSingle();
    product = (data as unknown as ProductRow | null) ?? null;
  } catch {
    product = null;
  }

  const productName = String(product?.name || slug).trim() || slug;
  const productDesc = String(product?.description || "").trim();
  const image = toAbsoluteUrl(String(product?.image || "").trim());
  const canonical = `/shop/${encodeURIComponent(slug)}`;
  const url = `${SITE_URL}${canonical}`;
  const price = typeof product?.price === "number" ? product.price : Number(product?.price);
  const qty = typeof product?.quantity === "number" ? product.quantity : Number(product?.quantity);
  const isInStock = Number.isFinite(qty) ? qty > 0 : true;

  const jsonLd =
    productName && url
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: productName,
          description: productDesc || undefined,
          category: String(product?.category_name || "").trim() || undefined,
          image: image ? [image] : undefined,
          sku: String(product?.id || "").trim() || undefined,
          brand: {
            "@type": "Brand",
            name: "JOEY THE BRAND",
          },
          offers: Number.isFinite(price)
            ? {
                "@type": "Offer",
                url,
                priceCurrency: "GHS",
                price: price,
                availability: isInStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                itemCondition: "https://schema.org/NewCondition",
              }
            : undefined,
        }
      : null;

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      <ProductClient slug={slug} />
    </>
  );
}
