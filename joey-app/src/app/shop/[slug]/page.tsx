import type { Metadata } from "next";
import ProductClient from "./ProductClient";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  return {
    title: `Product — JOEY THE BRAND`,
    description: "Shop custom and ready-to-wear pieces.",
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <ProductClient id={resolvedParams.id} />;
}
