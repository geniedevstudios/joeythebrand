import type { Metadata } from "next";
import CartClient from "./CartClient";

export const metadata: Metadata = {
  title: "Cart",
  description: "Review and manage your selected items from JOEY THE BRAND.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CartPage() {
  return (
    <div style={{ paddingTop: "var(--nav-height)" }}>
      <CartClient />
    </div>
  );
}
