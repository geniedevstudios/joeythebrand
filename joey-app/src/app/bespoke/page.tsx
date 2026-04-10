import type { Metadata } from "next";
import BespokeClient from "./BespokeClient";

export const metadata: Metadata = {
  title: "Book a Slot — JOEY THE BRAND Bespoke",
  description: "Book a bespoke or styling consultation with JOEY THE BRAND. By appointment only. Custom tailoring crafted around your presence.",
};

export default function BespokePage() {
  return <BespokeClient />;
}
