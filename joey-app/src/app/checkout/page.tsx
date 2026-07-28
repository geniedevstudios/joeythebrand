import type { Metadata } from "next";
import CheckoutClient from "./CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your purchase at JOEY THE BRAND.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CheckoutPage() {
  const dhlEnabled = !!(process.env.DHL_API_KEY && process.env.DHL_API_SECRET);
  return (
    <div style={{ paddingTop: "var(--nav-height)" }}>
      <CheckoutClient dhlEnabled={dhlEnabled} />
    </div>
  );
}