import type { MetadataRoute } from "next";

const SITE_URL = "https://consultwithurtailorstailor.joeythebrand.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    // Legacy/utility routes that are still public.
    { url: `${SITE_URL}/booking`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/booking/slip`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}

