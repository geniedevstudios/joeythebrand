import type { Metadata } from "next";
import CheckoutClient from "./CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your purchase at JOEY THE BRAND.",
};

export default function CheckoutPage() {
  return (
    <div style={{ paddingTop: "var(--nav-height)" }}>
      <CheckoutClient />
    </div>
  );
}