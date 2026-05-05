import type { Metadata } from "next";
import BespokeClient from "./BespokeClient";
import { fetchSiteContentForHome } from "@/lib/fetchSiteContentServer";
import { DEFAULT_SITE_CONTENT } from "@/lib/dataStore";

export const metadata: Metadata = {
  title: "Bespoke",
  description: "Book a bespoke or styling consultation with JOEY THE BRAND. By appointment only. Custom tailoring crafted around your presence.",
};

export const dynamic = "force-dynamic";

export default async function BespokePage() {
  const initialSiteContent = (await fetchSiteContentForHome()) ?? DEFAULT_SITE_CONTENT;
  return <BespokeClient initialSiteContent={initialSiteContent} />;
}
