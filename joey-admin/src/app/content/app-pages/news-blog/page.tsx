"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import NewsSpotlightsEditor from "@/components/NewsSpotlightsEditor";

export default function NewsBlogPage() {
  return (
    <div className="w-full max-w-none space-y-8">
      <div>
        <Link
          href="/content/app-pages"
          className="inline-flex items-center gap-1.5 text-sm mb-4 text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to App pages
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">News &amp; Blog</h1>
      </div>

      <NewsSpotlightsEditor />
    </div>
  );
}
