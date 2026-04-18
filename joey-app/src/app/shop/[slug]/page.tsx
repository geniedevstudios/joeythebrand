import type { Metadata } from "next";
import ProductClient from "./ProductClient";
import { supabase } from "@/lib/supabase";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  
  let productName = slug;
  try {
    const { data } = await supabase
      .from("products")
      .select("name")
      .or(`slug.eq.${slug},id.eq.${slug}`)
      .maybeSingle();
      
    if (data?.name) {
      productName = data.name;
    }
  } catch (e) {
    // fallback to slug
  }

  return {
    title: `${productName} | Shop | JOEY THE BRAND`,
    description: "Shop custom and ready-to-wear pieces.",
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  return <ProductClient slug={resolvedParams.slug} />;
}
