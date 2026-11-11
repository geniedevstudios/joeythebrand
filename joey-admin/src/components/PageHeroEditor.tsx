"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import { dataStore } from "@/lib/dataStore";
import type { PageHeroKey, PageHeroMedia, SiteContent } from "@/lib/types";
import { PAGE_HERO_LABELS } from "@/lib/pageHeroes";
import AssetUrlField from "@/components/AssetUrlField";
import HeroFitSelectors from "@/components/HeroFitSelectors";
import { toast } from "sonner";

export function PageHeroEditor({
  heroKey,
  heading = "Page hero",
}: {
  heroKey: PageHeroKey;
  heading?: string;
}) {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [src, setSrc] = useState("");
  const [tabletSrc, setTabletSrc] = useState("");
  const [mobileSrc, setMobileSrc] = useState("");
  const [fit, setFit] = useState<"cover" | "contain">("cover");
  const [anchor, setAnchor] = useState<"top" | "center" | "bottom">("top");
  const [mtoVideoUrl, setMtoVideoUrl] = useState("");
  const [mtoPosterUrl, setMtoPosterUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await dataStore.getSiteContent();
      setContent(data);
      if (heroKey === "home") return;
      const h = data.pageHeroes[heroKey];
      setSrc(h.src);
      setTabletSrc(h.tabletSrc ?? "");
      setMobileSrc(h.mobileSrc ?? "");
      setFit((h.fit ?? "cover") as any);
      setAnchor((h.anchor ?? "top") as any);
      setMtoVideoUrl(h.mtoVideoUrl ?? "");
      setMtoPosterUrl(h.mtoPosterUrl ?? "");
    } finally {
      setIsLoading(false);
    }
  }, [heroKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content || heroKey === "home") return;
    setIsSaving(true);
    try {
      const next: PageHeroMedia = {
        kind: "image",
        src: src.trim(),
        tabletSrc: tabletSrc.trim(),
        mobileSrc: mobileSrc.trim(),
        fit,
        anchor,
        ...(heroKey === "bespoke"
          ? {
              mtoVideoUrl: mtoVideoUrl.trim() || undefined,
              mtoPosterUrl: mtoPosterUrl.trim() || undefined,
            }
          : {}),
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

  if (heroKey === "home") return null;

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="text-sm text-zinc-900">Loading…</div>
      </div>
    );
  }

  if (!content) return <div className="text-sm text-zinc-900">No content found.</div>;

  return (
    <form onSubmit={save} className="space-y-8">
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-white px-6 py-5">
          <h3 className="text-base font-semibold leading-6 text-zinc-900">{heading}</h3>
          <p className="mt-1 text-xs text-zinc-600">
            These appear on {PAGE_HERO_LABELS[heroKey]}.
          </p>
        </div>
        <div className="space-y-4 p-6">
          <details className="group overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50" open>
            <summary className="flex list-none cursor-pointer items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-50">
              Desktop (Default)
              <span className="text-zinc-400 transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div className="space-y-4 p-4">
              <AssetUrlField
                label="Hero image"
                value={src}
                onChange={setSrc}
                uploadFolder={`heroes/${heroKey}`}
                accept="image/*"
              />
            </div>
          </details>

          <details className="group overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
            <summary className="flex list-none cursor-pointer items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-50">
              Tablet (iPad) — Optional
              <span className="text-zinc-400 transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div className="space-y-4 p-4">
              <AssetUrlField
                label="Tablet image"
                value={tabletSrc}
                onChange={setTabletSrc}
                uploadFolder={`heroes/${heroKey}-tablet`}
                accept="image/*"
              />
            </div>
          </details>

          <details className="group overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
            <summary className="flex list-none cursor-pointer items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-50">
              Mobile Phone — Optional
              <span className="text-zinc-400 transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div className="space-y-4 p-4">
              <AssetUrlField
                label="Mobile image"
                value={mobileSrc}
                onChange={setMobileSrc}
                uploadFolder={`heroes/${heroKey}-mobile`}
                accept="image/*"
              />
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

      {heroKey === "bespoke" ? (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 bg-white px-6 py-5">
            <h3 className="text-base font-semibold leading-6 text-zinc-900">
              Made to Order section — Background Video
            </h3>
            <p className="mt-1 text-xs text-zinc-600">
              Displayed behind the &ldquo;Made to Order Pieces&rdquo; header beneath the consultation form on /bespoke.
            </p>
          </div>
          <div className="space-y-4 p-6">
            <AssetUrlField
              id="bespoke-mto-video"
              label="Video (MP4 / WebM)"
              value={mtoVideoUrl}
              onChange={setMtoVideoUrl}
              uploadFolder="heroes/bespoke-mto-video"
              accept="video/*"
            />
            <AssetUrlField
              id="bespoke-mto-poster"
              label="Poster image (optional)"
              value={mtoPosterUrl}
              onChange={setMtoPosterUrl}
              uploadFolder="heroes/bespoke-mto-poster"
              accept="image/*"
              placeholder="Still image shown while video loads (or as fallback)"
            />
          </div>
        </div>
      ) : null}

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
  );
}
