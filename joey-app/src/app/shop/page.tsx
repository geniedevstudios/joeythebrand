import type { Metadata } from "next";
import { Suspense } from "react";
import ShopClient from "./ShopClient";
import styles from "./ShopClient.module.css";

export const metadata: Metadata = {
  title: "Shop The Collection — JOEY THE BRAND",
  description: "Browse JOEY THE BRAND collections: Always Lit, Limited-Edition, and Sample Sale. Architectural tailoring with cultural depth.",
};

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div
          className={`page-hero-shell ${styles.pageHeader}`}
          data-page-hero-empty="true"
          data-page-hero-loading="true"
          style={{ backgroundColor: "#000" }}
          aria-busy="true"
        />
      }
    >
      <ShopClient />
    </Suspense>
  );
}
