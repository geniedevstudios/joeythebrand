import type { Metadata } from "next";
import AccountClient from "./AccountClient";

export const metadata: Metadata = {
  title: "Account",
  description: "Manage your JOEY THE BRAND orders and bespoke appointments.",
};

export default function AccountPage() {
  return (
    <div style={{ paddingTop: "var(--nav-height)" }}>
      <AccountClient />
    </div>
  );
}
