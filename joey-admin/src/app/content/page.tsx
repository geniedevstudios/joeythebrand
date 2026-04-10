"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { dataStore } from "@/lib/dataStore";
import type { SiteContent, PageHeroKey, PageHeroMedia } from "@/lib/types";
import { PAGE_HERO_KEYS, PAGE_HERO_LABELS } from "@/lib/pageHeroes";
import AssetUrlField from "@/components/AssetUrlField";
import HeroFitSelectors from "@/components/HeroFitSelectors";

export default function ContentPage() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [pageHeroes, setPageHeroes] = useState<SiteContent["pageHeroes"] | null>(null);
  const [homeKind, setHomeKind] = useState<"image" | "video">("image");
  const [homePrimaryUrl, setHomePrimaryUrl] = useState("");
  const [homePosterUrl, setHomePosterUrl] = useState("");
  const [aboutImageUrl, setAboutImageUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await dataStore.getSiteContent();
      setContent(data);
      setPageHeroes(data.pageHeroes);
      const h = data.pageHeroes.home;
      setHomeKind(h.kind);
      setHomePrimaryUrl(h.src);
      setHomePosterUrl(h.kind === "video" ? data.heroImage : "");
      setAboutImageUrl(data.aboutImage);
    } catch (err) {
      console.error("Failed to load site content:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patchHero = (key: PageHeroKey, patch: Partial<PageHeroMedia>) => {
    setPageHeroes((prev) => {
      if (!prev) return prev;
      const cur = prev[key];
      return { ...prev, [key]: { ...cur, ...patch } as PageHeroMedia };
    });
  };

  const setHeroSrc = (key: PageHeroKey, src: string) => {
    setPageHeroes((prev) => {
      if (!prev) return prev;
      const cur = prev[key];
      return { ...prev, [key]: { ...cur, src } as PageHeroMedia };
    });
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!content || !pageHeroes) return;
    setIsSaving(true);
    setSaveMsg("");
    setError("");

    const formData = new FormData(e.currentTarget);

    try {
      const hMeta = pageHeroes.home;
      const homeMedia: PageHeroMedia =
        homeKind === "video"
          ? {
              kind: "video",
              src: homePrimaryUrl.trim() || "/hero.png",
              fit: hMeta.fit ?? "cover",
              anchor: hMeta.anchor ?? "top",
            }
          : {
              kind: "image",
              src: homePrimaryUrl.trim() || "/hero.png",
              fit: hMeta.fit ?? "cover",
              anchor: hMeta.anchor ?? "top",
            };

      const nextHeroes: SiteContent["pageHeroes"] = {
        ...pageHeroes,
        home: homeMedia,
      };

      const heroImageOut =
        homeKind === "video"
          ? (homePosterUrl.trim() || homePrimaryUrl.trim() || "/hero.png")
          : (homePrimaryUrl.trim() || "/hero.png");

      await dataStore.updateSiteContent({
        heroImage: heroImageOut,
        heroTitle: formData.get("heroTitle") as string,
        heroSubtitle: formData.get("heroSubtitle") as string,
        aboutImage: aboutImageUrl.trim() || content.aboutImage,
        aboutText: formData.get("aboutText") as string,
        pageHeroes: nextHeroes,
      });
      setSaveMsg("Site content updated successfully!");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save content.");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-zinc-500">Loading content...</div>
      </div>
    );
  }

  if (!content || !pageHeroes) return <div className="text-sm text-zinc-500">No content found.</div>;

  const secondaryKeys = PAGE_HERO_KEYS.filter((k) => k !== "home");

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Site Content</h1>
          <p className="mt-2 text-sm text-neutral-600">
            <Link
              href="/content/consultations"
              className="font-medium text-zinc-800 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-950"
            >
              Bespoke consultations
            </Link>
            <span className="text-zinc-400"> — </span>
            review slot requests and confirm booking codes.
            <span className="text-zinc-400"> · </span>
            <Link
              href="/content/newsletter"
              className="font-medium text-zinc-800 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-950"
            >
              Newsletter
            </Link>
            <span className="text-zinc-400"> — </span>
            send updates to your Brevo list from here.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="border-b border-zinc-200 px-6 py-5 bg-white">
            <h3 className="text-base font-semibold leading-6 text-zinc-900">Home — hero background</h3>
            <p className="mt-1 text-sm text-zinc-500">
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
            {homeKind === "video" && (
              <AssetUrlField
                label="Poster image URL"
                value={homePosterUrl}
                onChange={setHomePosterUrl}
                uploadFolder="heroes/home-poster"
                accept="image/*"
                placeholder="Shown before video loads"
              />
            )}
            <HeroFitSelectors
              fit={pageHeroes.home.fit ?? "cover"}
              anchor={pageHeroes.home.anchor ?? "top"}
              onFit={(f) => patchHero("home", { fit: f })}
              onAnchor={(a) => patchHero("home", { anchor: a })}
            />
            <div>
              <label className="block text-sm font-medium text-zinc-700">Hero Title</label>
              <input type="text" name="heroTitle" defaultValue={content.heroTitle}
                className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm sm:text-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Hero Subtitle</label>
              <input type="text" name="heroSubtitle" defaultValue={content.heroSubtitle}
                className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm sm:text-sm p-2 border" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="border-b border-zinc-200 px-6 py-5 bg-white">
            <h3 className="text-base font-semibold leading-6 text-zinc-900">Page hero backgrounds</h3>
            <p className="mt-1 text-sm text-zinc-500">
              One image per page. For wide strips, ~1920×700px works well with <em>Fill banner</em>. Choose{" "}
              <em>Show full image</em> if nothing should be cropped (empty side bars may appear).
            </p>
          </div>
          <div className="p-6 grid gap-4 sm:grid-cols-2">
            {secondaryKeys.map((key) => (
              <div key={key} className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-3">
                <AssetUrlField
                  label={PAGE_HERO_LABELS[key]}
                  value={pageHeroes[key].src}
                  onChange={(url) => setHeroSrc(key, url)}
                  uploadFolder={`heroes/${key}`}
                  accept="image/*"
                />
                <HeroFitSelectors
                  fit={pageHeroes[key].fit ?? "cover"}
                  anchor={pageHeroes[key].anchor ?? "top"}
                  onFit={(f) => patchHero(key, { fit: f })}
                  onAnchor={(a) => patchHero(key, { anchor: a })}
                  compact
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="border-b border-zinc-200 px-6 py-5 bg-white">
            <h3 className="text-base font-semibold leading-6 text-zinc-900">About / Founder Section</h3>
            <p className="mt-1 text-sm text-zinc-500">The introduction and story of Joey The Brand.</p>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <AssetUrlField
                label="About image URL"
                value={aboutImageUrl}
                onChange={setAboutImageUrl}
                uploadFolder="about"
                accept="image/*"
              />
              <div className="mt-3">
                <img src={aboutImageUrl || content.aboutImage} alt="About Preview" className="h-24 w-20 object-cover rounded shadow-sm border" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">About Text</label>
              <textarea name="aboutText" rows={4} defaultValue={content.aboutText}
                className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm sm:text-sm p-2 border" />
            </div>
          </div>
        </div>

        {saveMsg && (
          <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded p-3">{saveMsg}</p>
        )}
        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-3">{error}</p>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={isSaving}
            className="rounded-md bg-zinc-950 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-60">
            {isSaving ? "Saving..." : "Save All Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
