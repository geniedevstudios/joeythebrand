"use client";

import NewsSpotlightsEditor from "@/components/NewsSpotlightsEditor";
import { PageHeroEditor } from "@/components/PageHeroEditor";

export default function NewsBlogPage() {
  return (
    <div className="w-full max-w-none space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900">News &amp; Blog</h2>
        <p className="mt-1 text-sm text-zinc-800">These appear on News &amp; Blog.</p>
      </div>

      <PageHeroEditor heroKey="news" heading="Opening image" />
      <NewsSpotlightsEditor />
    </div>
  );
}
