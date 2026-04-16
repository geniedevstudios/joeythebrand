import type { Metadata } from "next";
import { Suspense } from "react";
import ShopClient from "./ShopClient";

export const metadata: Metadata = {
  title: "Shop The Collection — JOEY THE BRAND",
  description: "Browse JOEY THE BRAND collections: Always Lit, Limited-Edition, and Sample Sale. Architectural tailoring with cultural depth.",
};

export default function ShopPage() {
  return (
    <Suspense
      fallback={<div className="container" style={{ padding: "clamp(3rem, 12vw, 6rem) 0" }} aria-busy="true" />}
    >
      <ShopClient />
    </Suspense>
  );
}
