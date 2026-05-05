import type { Metadata } from "next";
import CollectionDetailClient from "./CollectionDetailClient";
import { createClient } from "@supabase/supabase-js";

type CollectionRow = { name?: string | null; description?: string | null; image?: string | null; slug?: string | null };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  const canonical = `/collection/${encodeURIComponent(slug)}`;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return {
      title: "Collection",
      description: "Explore the JOEY THE BRAND archive collections.",
      alternates: { canonical },
    };
  }

  const supabase = createClient(url, key);
  const { data } = await supabase
    .from("collections")
    .select("name,description,image,slug")
    .eq("slug", slug)
    .maybeSingle();

  const row = (data || null) as CollectionRow | null;
  const name = (row?.name ?? slug).toString();
  const description = (row?.description ?? "").toString().trim() || `Explore the ${name} collection from JOEY THE BRAND.`;
  const image = (row?.image ?? "").toString().trim() || undefined;

  return {
    title: `${name} | Collection`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${name} — Collection`,
      description,
      type: "website",
      url: canonical,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: `${name} — Collection`,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function CollectionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CollectionDetailClient slug={slug} />;
}
