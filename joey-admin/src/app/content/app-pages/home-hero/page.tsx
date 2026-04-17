"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { dataStore } from "@/lib/dataStore";
import type { PageHeroMedia, SiteContent } from "@/lib/types";
import AssetUrlField from "@/components/AssetUrlField";
import HeroFitSelectors from "@/components/HeroFitSelectors";
import { toast } from "sonner";

export default function HomeHeroPage() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [homeKind, setHomeKind] = useState<"image" | "video">("image");
  const [homePrimaryUrl, setHomePrimaryUrl] = useState("");
  const [homePosterUrl, setHomePosterUrl] = useState("");
  const [fit, setFit] = useState<"cover" | "contain">("cover");
  const [anchor, setAnchor] = useState<"top" | "center" | "bottom">("top");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await dataStore.getSiteContent();
      setContent(data);
      const h = data.pageHeroes.home;
      setHomeKind(h.kind);
      setHomePrimaryUrl(h.src);
      setHomePosterUrl(h.kind === "video" ? data.heroImage : "");
      setFit((h.fit ?? "cover") as any);
      setAnchor((h.anchor ?? "top") as any);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content) return;
    setIsSaving(true);
    try {
      const homeMedia: PageHeroMedia =
        homeKind === "video"
          ? { kind: "video", src: homePrimaryUrl.trim() || "/hero.png", fit, anchor }
          : { kind: "image", src: homePrimaryUrl.trim() || "/hero.png", fit, anchor };

      const nextHeroes = { ...content.pageHeroes, home: homeMedia };

      const heroImageOut =
        homeKind === "video"
          ? (homePosterUrl.trim() || homePrimaryUrl.trim() || "/hero.png")
          : (homePrimaryUrl.trim() || "/hero.png");

      await dataStore.updateSiteContent({
        heroImage: heroImageOut,
        pageHeroes: nextHeroes,
      });

      toast.success("Home hero saved.");
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

  if (!content) return <div className="text-sm text-zinc-900">No content found.</div>;

  return (
    <div className="w-full max-w-none space-y-6">
      <div>
        <nav className="mb-2 text-sm text-zinc-800">
          <Link href="/content" className="hover:text-zinc-900">
            Site Content
          </Link>
          <span className="mx-2 text-zinc-300">/</span>
          <Link href="/content/app-pages" className="hover:text-zinc-900">
            App pages
          </Link>
          <span className="mx-2 text-zinc-300">/</span>
          <span className="font-medium text-zinc-900">Home hero</span>
        </nav>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Home — hero background</h1>
      </div>

      <form onSubmit={save} className="space-y-8">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-visible">
          <div className="border-b border-zinc-200 px-6 py-5 bg-white">
            <h3 className="text-base font-semibold leading-6 text-zinc-900">Media</h3>
            <p className="mt-1 text-sm text-zinc-900">
              Image or short video (MP4/WebM). Poster is used while the video loads.
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="homeMediaKind"
                  checked={homeKind === "image"}
                  onChange={() => setHomeKind("image")}
                />
                Image
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="homeMediaKind"
                  checked={homeKind === "video"}
                  onChange={() => setHomeKind("video")}
                />
                Video
              </label>
            </div>

            <AssetUrlField
              label={homeKind === "video" ? "Video URL" : "Image URL"}
              value={homePrimaryUrl}
              onChange={setHomePrimaryUrl}
              uploadFolder="heroes/home"
              accept={homeKind === "video" ? "video/*" : "image/*"}
              placeholder="https://… or /hero.png"
            />

            {homeKind === "video" ? (
              <AssetUrlField
                label="Poster image URL"
                value={homePosterUrl}
                onChange={setHomePosterUrl}
                uploadFolder="heroes/home-poster"
                accept="image/*"
                placeholder="Shown before video loads"
              />
            ) : null}

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

