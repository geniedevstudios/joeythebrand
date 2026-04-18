"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { dataStore } from "@/lib/dataStore";
import type { SiteContent } from "@/lib/types";
import AssetUrlField from "@/components/AssetUrlField";
import { toast } from "sonner";

export default function HomeFounderPage() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [kicker, setKicker] = useState("");
  const [headline, setHeadline] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaHref, setCtaHref] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await dataStore.getSiteContent();
      setContent(data);
      setVideoUrl(data.founderVideoUrl);
      setPosterUrl(data.founderVideoPosterUrl);
      setKicker(data.founderKicker);
      setHeadline(data.founderHeadline);
      setCtaLabel(data.founderCtaLabel);
      setCtaHref(data.founderCtaHref);
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
      await dataStore.updateSiteContent({
        founderVideoUrl: videoUrl.trim(),
        founderVideoPosterUrl: posterUrl.trim(),
        founderKicker: kicker.trim(),
        founderHeadline: headline.trim(),
        founderCtaLabel: ctaLabel.trim(),
        founderCtaHref: ctaHref.trim() || "/story",
      });
      toast.success("Home founder block saved.");
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
          <span className="font-medium text-zinc-900">Home — founder</span>
        </nav>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Home — founder section</h1>
        <p className="mt-2 text-sm text-zinc-900 max-w-2xl">
          Background video and copy for the “Behind the pattern” block on the homepage. Stats (collections,
          bespoke clients, location) stay in the storefront.
        </p>
      </div>

      <form onSubmit={save} className="space-y-8">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-visible">
          <div className="border-b border-zinc-200 px-6 py-5 bg-white">
            <h3 className="text-base font-semibold leading-6 text-zinc-900">Background media</h3>
            <p className="mt-1 text-sm text-zinc-900">
              Add a video (MP4/WebM), a poster image, or both. If you only upload a poster, the homepage shows that
              still image behind the section; with a video, the poster appears until the first frames play.
            </p>
          </div>
          <div className="p-6 space-y-4">
            <AssetUrlField
              label="Video URL"
              value={videoUrl}
              onChange={setVideoUrl}
              uploadFolder="site/founder"
              accept="video/*"
              placeholder="https://… or /path/to/video.mp4"
            />
            <AssetUrlField
              label="Poster image URL (optional)"
              value={posterUrl}
              onChange={setPosterUrl}
              uploadFolder="site/founder-poster"
              accept="image/*"
              placeholder="Still background if no video; otherwise shown until video plays"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 space-y-4">
          <h3 className="text-base font-semibold text-zinc-900">Copy</h3>
          <label className="block">
            <span className="text-sm font-medium text-zinc-900">Kicker (small caps line)</span>
            <input
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
              value={kicker}
              onChange={(e) => setKicker(e.target.value)}
              placeholder="BEHIND THE PATTERN"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-900">Headline</span>
            <textarea
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 min-h-[5rem]"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="An intimate look at the craft…"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-zinc-900">Button label</span>
              <input
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder="DISCOVER THE STORY"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-zinc-900">Button link</span>
              <input
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                value={ctaHref}
                onChange={(e) => setCtaHref(e.target.value)}
                placeholder="/story"
              />
            </label>
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
