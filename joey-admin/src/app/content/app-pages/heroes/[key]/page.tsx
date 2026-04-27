"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";
import { dataStore } from "@/lib/dataStore";
import type { PageHeroKey, PageHeroMedia, SiteContent } from "@/lib/types";
import { PAGE_HERO_KEYS, PAGE_HERO_LABELS } from "@/lib/pageHeroes";
import AssetUrlField from "@/components/AssetUrlField";
import HeroFitSelectors from "@/components/HeroFitSelectors";
import { toast } from "sonner";

function isPageHeroKey(v: string): v is PageHeroKey {
  return (PAGE_HERO_KEYS as string[]).includes(v);
}

export default function SingleHeroPage() {
  const params = useParams<{ key?: string }>();
  const rawKey = params?.key ? String(params.key) : "";
  const heroKey = useMemo(() => (isPageHeroKey(rawKey) ? (rawKey as PageHeroKey) : null), [rawKey]);

  const [content, setContent] = useState<SiteContent | null>(null);
  const [src, setSrc] = useState("");
  const [fit, setFit] = useState<"cover" | "contain">("cover");
  const [anchor, setAnchor] = useState<"top" | "center" | "bottom">("top");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await dataStore.getSiteContent();
      setContent(data);
      if (!heroKey || heroKey === "home") return;
      const h = data.pageHeroes[heroKey];
      setSrc(h.src);
      setFit((h.fit ?? "cover") as any);
      setAnchor((h.anchor ?? "top") as any);
    } finally {
      setIsLoading(false);
    }
  }, [heroKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content || !heroKey || heroKey === "home") return;
    setIsSaving(true);
    try {
      const next: PageHeroMedia = {
        kind: "image",
        src: src.trim(),
        fit,
        anchor,
      };

      await dataStore.updateSiteContent({
        pageHeroes: { ...content.pageHeroes, [heroKey]: next },
      });
      toast.success(`${PAGE_HERO_LABELS[heroKey]} hero saved.`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!heroKey || heroKey === "home") {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Unknown page</h1>
        <p className="text-sm text-zinc-800">
          Pick one of the supported pages from{" "}
          <Link href="/content/app-pages" className="underline">
            App pages
          </Link>
          .
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-zinc-900">Loading…</div>
      </div>
    );
  }

  if (!content) return <div className="text-sm text-zinc-900">No content found.</div>;

  return (
    <div className="w-full max-w-none space-y-6">
      <div>
        <Link 
          href="/content/app-pages/page-heroes" 
          className="inline-flex items-center gap-1.5 text-sm mb-4 text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Page heroes
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          {PAGE_HERO_LABELS[heroKey]} — hero background
        </h1>
      </div>

      <form onSubmit={save} className="space-y-8">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="border-b border-zinc-200 px-6 py-5 bg-white">
            <h3 className="text-base font-semibold leading-6 text-zinc-900">Image</h3>
          </div>
          <div className="p-6 space-y-4">
            <AssetUrlField
              label="Hero image URL"
              value={src}
              onChange={setSrc}
              uploadFolder={`heroes/${heroKey}`}
              accept="image/*"
            />
            <HeroFitSelectors
              fit={fit}
              anchor={anchor}
              onFit={(f) => setFit(f)}
              onAnchor={(a) => setAnchor(a)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-zinc-950 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

