import type { Metadata } from "next";
import { fetchSiteContent } from "@/lib/fetchSiteContentServer";
import { DEFAULT_SITE_CONTENT } from "@/lib/dataStore";
import NewsClient from "./NewsClient";

export const metadata: Metadata = {
  title: "News & Blog",
  description: "Videos, podcasts, and updates from JOEY THE BRAND.",
};

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const raw = await fetchSiteContent();
  const site = raw ?? DEFAULT_SITE_CONTENT;
  const items = site.newsSpotlights?.filter(Boolean) ?? [];

  return <NewsClient initialSiteContent={site} items={items} />;
}
