import type { Metadata } from "next";
import { Suspense } from "react";
import ContactClient from "./ContactClient";
import { fetchSiteContentForHome } from "@/lib/fetchSiteContentServer";
import { DEFAULT_SITE_CONTENT } from "@/lib/dataStore";

export const metadata: Metadata = {
  title: "Contact — JOEY THE BRAND",
  description: "Reach out to JOEY THE BRAND for custom orders, press inquiries, collaborations, or consulting. Based in Accra, Ghana.",
};

/** Fresh hero + copy from Supabase so admin edits don’t show a stale shell. */
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const initialSiteContent = (await fetchSiteContentForHome()) ?? DEFAULT_SITE_CONTENT;
  return (
    <Suspense fallback={<div className="container" style={{ padding: "clamp(3rem, 12vw, 6rem) 0" }} aria-busy="true" />}>
      <ContactClient initialSiteContent={initialSiteContent} />
    </Suspense>
  );
}
