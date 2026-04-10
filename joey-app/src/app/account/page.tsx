import type { Metadata } from "next";
import AccountClient from "./AccountClient";

export const metadata: Metadata = {
  title: "Your Account — JOEY THE BRAND",
  description: "Manage your JOEY THE BRAND orders and bespoke appointments.",
};

export default function AccountPage() {
  return (
    <div style={{ paddingTop: "var(--nav-height)" }}>
      <AccountClient />
    </div>
  );
}
