"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
  const [homeTabletUrl, setHomeTabletUrl] = useState("");
  const [homeMobileUrl, setHomeMobileUrl] = useState("");
  const [homeTabletPosterUrl, setHomeTabletPosterUrl] = useState("");
  const [homeMobilePosterUrl, setHomeMobilePosterUrl] = useState("");
  const [fit, setFit] = useState<"cover" | "contain">("cover");
  const [anchor, setAnchor] = useState<"top" | "center" | "bottom">("top");

  // Founder Section fields
  const [founderVideoUrl, setFounderVideoUrl] = useState("");
  const [founderPosterUrl, setFounderPosterUrl] = useState("");
  const [founderKicker, setFounderKicker] = useState("");
  const [founderHeadline, setFounderHeadline] = useState("");
  const [founderCtaLabel, setFounderCtaLabel] = useState("");
  const [founderCtaHref, setFounderCtaHref] = useState("");

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
      setHomeTabletUrl(h.tabletSrc ?? "");
      setHomeMobileUrl(h.mobileSrc ?? "");
      setHomeTabletPosterUrl(h.kind === "video" ? (h.tabletPosterUrl ?? "") : "");
      setHomeMobilePosterUrl(h.kind === "video" ? (h.mobilePosterUrl ?? "") : "");
      setFit((h.fit ?? "cover") as any);
      setAnchor((h.anchor ?? "top") as any);

      // Founder Section
      setFounderVideoUrl(data.founderVideoUrl);
      setFounderPosterUrl(data.founderVideoPosterUrl);
      setFounderKicker(data.founderKicker);
      setFounderHeadline(data.founderHeadline);
      setFounderCtaLabel(data.founderCtaLabel);
      setFounderCtaHref(data.founderCtaHref);
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
      const primary = homePrimaryUrl.trim();
      const homeMedia: PageHeroMedia =
        homeKind === "video"
          ? { 
              kind: "video", 
              src: primary, 
              tabletSrc: homeTabletUrl.trim(),
              mobileSrc: homeMobileUrl.trim(),
              tabletPosterUrl: homeTabletPosterUrl.trim(),
              mobilePosterUrl: homeMobilePosterUrl.trim(),
              fit, 
              anchor 
            }
          : { 
              kind: "image", 
              src: primary, 
              tabletSrc: homeTabletUrl.trim(),
              mobileSrc: homeMobileUrl.trim(),
              fit, 
              anchor 
            };

      const nextHeroes = { ...content.pageHeroes, home: homeMedia };

      const heroImageOut =
        homeKind === "video"
          ? (homePosterUrl.trim() || primary)
          : primary;

      await dataStore.updateSiteContent({
        heroImage: heroImageOut,
        pageHeroes: nextHeroes,
        founderVideoUrl: founderVideoUrl.trim(),
        founderVideoPosterUrl: founderPosterUrl.trim(),
        founderKicker: founderKicker.trim(),
        founderHeadline: founderHeadline.trim(),
        founderCtaLabel: founderCtaLabel.trim(),
        founderCtaHref: founderCtaHref.trim() || "/story",
      });

      toast.success("Home page saved.");
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
        <Link 
          href="/content/app-pages" 
          className="inline-flex items-center gap-1.5 text-sm mb-4 text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to App pages
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Home page</h1>
      </div>

      <form onSubmit={save} className="space-y-8">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-visible">
          <div className="border-b border-zinc-200 px-6 py-5 bg-white">
            <h3 className="text-base font-semibold leading-6 text-zinc-900">Media</h3>
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

            <details className="group border border-zinc-200 rounded-lg bg-zinc-50 overflow-hidden" open>
              <summary className="cursor-pointer font-semibold px-4 py-3 bg-white hover:bg-zinc-50 border-b border-zinc-200 list-none flex justify-between items-center text-sm">
                Desktop (Default)
                <span className="text-zinc-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-4 space-y-4">
                <AssetUrlField
                  label={homeKind === "video" ? "Video URL" : "Image URL"}
                  value={homePrimaryUrl}
                  onChange={setHomePrimaryUrl}
                  uploadFolder="heroes/home"
                  accept={homeKind === "video" ? "video/*" : "image/*"}
                  placeholder="https://… or /path/from/public.jpg"
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
              </div>
            </details>

            <details className="group border border-zinc-200 rounded-lg bg-zinc-50 overflow-hidden">
              <summary className="cursor-pointer font-semibold px-4 py-3 bg-white hover:bg-zinc-50 border-b border-zinc-200 list-none flex justify-between items-center text-sm">
                Tablet (iPad) — Optional
                <span className="text-zinc-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-4 space-y-4">
                <AssetUrlField
                  label={homeKind === "video" ? "Tablet Video URL" : "Tablet Image URL"}
                  value={homeTabletUrl}
                  onChange={setHomeTabletUrl}
                  uploadFolder="heroes/home-tablet"
                  accept={homeKind === "video" ? "video/*" : "image/*"}
                  placeholder="Optional: custom file for tablets"
                />

                {homeKind === "video" ? (
                  <AssetUrlField
                    label="Tablet Poster URL"
                    value={homeTabletPosterUrl}
                    onChange={setHomeTabletPosterUrl}
                    uploadFolder="heroes/home-tablet-poster"
                    accept="image/*"
                  />
                ) : null}
              </div>
            </details>

            <details className="group border border-zinc-200 rounded-lg bg-zinc-50 overflow-hidden">
              <summary className="cursor-pointer font-semibold px-4 py-3 bg-white hover:bg-zinc-50 border-b border-zinc-200 list-none flex justify-between items-center text-sm">
                Mobile Phone — Optional
                <span className="text-zinc-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-4 space-y-4">
                <AssetUrlField
                  label={homeKind === "video" ? "Mobile Video URL" : "Mobile Image URL"}
                  value={homeMobileUrl}
                  onChange={setHomeMobileUrl}
                  uploadFolder="heroes/home-mobile"
                  accept={homeKind === "video" ? "video/*" : "image/*"}
                  placeholder="Optional: custom file for phones"
                />

                {homeKind === "video" ? (
                  <AssetUrlField
                    label="Mobile Poster URL"
                    value={homeMobilePosterUrl}
                    onChange={setHomeMobilePosterUrl}
                    uploadFolder="heroes/home-mobile-poster"
                    accept="image/*"
                  />
                ) : null}
              </div>
            </details>

            <HeroFitSelectors
              fit={fit}
              anchor={anchor}
              onFit={(f) => setFit(f)}
              onAnchor={(a) => setAnchor(a)}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-visible">
          <div className="border-b border-zinc-200 px-6 py-5 bg-white">
            <h3 className="text-base font-semibold leading-6 text-zinc-900">Founder section</h3>
          </div>
          <div className="p-6 space-y-8">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-zinc-900">Background Media</h4>
              <AssetUrlField
                label="Video URL"
                value={founderVideoUrl}
                onChange={setFounderVideoUrl}
                uploadFolder="site/founder"
                accept="video/*"
                placeholder="https://… or /path/to/video.mp4"
              />
              <AssetUrlField
                label="Poster image URL (optional)"
                value={founderPosterUrl}
                onChange={setFounderPosterUrl}
                uploadFolder="site/founder-poster"
                accept="image/*"
                placeholder="Still background if no video; otherwise shown until video plays"
              />
            </div>

            <hr className="border-zinc-200" />

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-zinc-900">Founder section texts and buttons</h4>
              <label className="block">
                <span className="text-sm font-medium text-zinc-900">Kicker (small caps line)</span>
                <input
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                  value={founderKicker}
                  onChange={(e) => setFounderKicker(e.target.value)}
                  placeholder="BEHIND THE PATTERN"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-zinc-900">Headline</span>
                <textarea
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 min-h-[5rem]"
                  value={founderHeadline}
                  onChange={(e) => setFounderHeadline(e.target.value)}
                  placeholder="An intimate look at the craft…"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-zinc-900">Button label</span>
                  <input
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                    value={founderCtaLabel}
                    onChange={(e) => setFounderCtaLabel(e.target.value)}
                    placeholder="DISCOVER THE STORY"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-zinc-900">Button link</span>
                  <input
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                    value={founderCtaHref}
                    onChange={(e) => setFounderCtaHref(e.target.value)}
                    placeholder="/story"
                  />
                </label>
              </div>
            </div>
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

