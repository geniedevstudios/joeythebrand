import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Account — JOEY THE BRAND",
  description: "Sign in to your JOEY THE BRAND account.",
};

export default function LoginPage() {
  return <LoginClient />;
}
