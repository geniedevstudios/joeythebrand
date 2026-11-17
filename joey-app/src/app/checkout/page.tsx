import type { Metadata } from "next";
import CheckoutClient from "./CheckoutClient";
import { getDhlEnvironment } from "@/lib/dhl";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your purchase at JOEY THE BRAND.",
  robots: {
    index: false,
    follow: false,
  },
};

function validDhlEnvironment() {
  try {
    getDhlEnvironment();
    return true;
  } catch {
    return false;
  }
}

export default function CheckoutPage() {
  const dhlEnabled = validDhlEnvironment() && !!(
    process.env.DHL_API_KEY?.trim() &&
    process.env.DHL_API_SECRET?.trim() &&
    process.env.DHL_ACCOUNT_NUMBER?.trim()
  );
  return (
    <div style={{ paddingTop: "var(--nav-height)" }}>
      <CheckoutClient dhlEnabled={dhlEnabled} />
    </div>
  );
}