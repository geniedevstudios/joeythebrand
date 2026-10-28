"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { dataStore } from "@/lib/dataStore";
import type { PageHeroKey, PageHeroMedia, SiteContent } from "@/lib/types";
import { PAGE_HERO_KEYS, PAGE_HERO_LABELS } from "@/lib/pageHeroes";
import AssetUrlField from "@/components/AssetUrlField";
import HeroFitSelectors from "@/components/HeroFitSelectors";
import { toast } from "sonner";

type LocalHero = {
  src: string;
  fit: "cover" | "contain";
  anchor: "top" | "center" | "bottom";
};

export default function PageHeroesIndexPage() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [heroes, setHeroes] = useState<Record<PageHeroKey, LocalHero> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await dataStore.getSiteContent();
      setContent(data);
      const next: Record<PageHeroKey, LocalHero> = {} as any;
      for (const k of PAGE_HERO_KEYS.filter((x) => x !== "home")) {
        const h = data.pageHeroes[k];
        next[k] = {
          src: h.src,
          fit: (h.fit ?? "cover") as any,
          anchor: (h.anchor ?? "top") as any,
        };
      }
      setHeroes(next);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = (key: PageHeroKey, p: Partial<LocalHero>) => {
    setHeroes((prev) => (prev ? { ...prev, [key]: { ...prev[key], ...p } } : prev));
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!content || !heroes) return;
    setIsSaving(true);
    try {
      const nextPageHeroes: SiteContent["pageHeroes"] = { ...content.pageHeroes };
      for (const k of Object.keys(heroes) as PageHeroKey[]) {
        const cur = content.pageHeroes[k];
        const local = heroes[k];
        const next: PageHeroMedia = {
          ...cur,
          kind: cur.kind === "video" ? "image" : cur.kind,
          src: local.src.trim(),
          fit: local.fit,
          anchor: local.anchor,
        };
        nextPageHeroes[k] = next;
      }

      await dataStore.updateSiteContent({ pageHeroes: nextPageHeroes });
      toast.success("Page heroes saved.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-zinc-900">Loading…</div>
      </div>
    );
  }

  if (!content || !heroes) return <div className="text-sm text-zinc-900">No content found.</div>;

  const keys = PAGE_HERO_KEYS.filter((k) => k !== "home");

  return (
    <div className="w-full max-w-none space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link 
            href="/content/app-pages" 
            className="inline-flex items-center gap-1.5 text-sm mb-4 text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to App pages
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Page hero backgrounds</h1>
          <p className="mt-1 text-sm text-zinc-900">
            Edit all non-home page heroes here, or open a single page for focus.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {keys.map((k) => (
          <Link
            key={k}
            href={`/content/app-pages/heroes/${k}`}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="text-sm font-semibold text-zinc-900">{PAGE_HERO_LABELS[k]}</div>
            <div className="mt-1 text-xs text-zinc-800">Open single-page editor</div>
          </Link>
        ))}
      </div>

      <form onSubmit={save} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="border-b border-zinc-200 px-6 py-5 bg-white">
            <h3 className="text-base font-semibold leading-6 text-zinc-900">All page heroes</h3>
          </div>
          <div className="p-6 grid gap-4 sm:grid-cols-2">
            {keys.map((key) => (
              <div key={key} className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-3">
                <AssetUrlField
                  label={PAGE_HERO_LABELS[key]}
                  value={heroes[key].src}
                  onChange={(url) => patch(key, { src: url })}
                  uploadFolder={`heroes/${key}`}
                  accept="image/*"
                />
                <HeroFitSelectors
                  fit={heroes[key].fit}
                  anchor={heroes[key].anchor}
                  onFit={(f) => patch(key, { fit: f })}
                  onAnchor={(a) => patch(key, { anchor: a })}
                  compact
                />
              </div>
            ))}
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

