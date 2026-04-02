import type { Metadata } from "next";
import ShopClient from "./ShopClient";

export const metadata: Metadata = {
  title: "Shop The Collection — JOEY THE BRAND",
  description: "Browse JOEY THE BRAND collections: Always Lit, Limited-Edition, and Sample Sale. Architectural tailoring with cultural depth.",
};

export default function ShopPage() {
  return <ShopClient />;
}
