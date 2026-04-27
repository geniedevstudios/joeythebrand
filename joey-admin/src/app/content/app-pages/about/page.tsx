"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { dataStore } from "@/lib/dataStore";
import type { SiteContent } from "@/lib/types";
import AssetUrlField from "@/components/AssetUrlField";
import { toast } from "sonner";

export default function AboutContentPage() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [aboutImageUrl, setAboutImageUrl] = useState("");
  const [aboutText, setAboutText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await dataStore.getSiteContent();
      setContent(data);
      setAboutImageUrl(data.aboutImage);
      setAboutText(data.aboutText);
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
        aboutImage: aboutImageUrl.trim() || content.aboutImage,
        aboutText,
      });
      toast.success("About section saved.");
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
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">About / Founder section</h1>
      </div>

      <form onSubmit={save} className="space-y-8">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="border-b border-zinc-200 px-6 py-5 bg-white">
            <h3 className="text-base font-semibold leading-6 text-zinc-900">Image</h3>
          </div>
          <div className="p-6 space-y-4">
            <AssetUrlField
              label="About image URL"
              value={aboutImageUrl}
              onChange={setAboutImageUrl}
              uploadFolder="about"
              accept="image/*"
            />
            <div className="mt-3">
              <img
                src={aboutImageUrl || content.aboutImage}
                alt="About Preview"
                className="h-24 w-20 object-cover rounded shadow-sm border"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="border-b border-zinc-200 px-6 py-5 bg-white">
            <h3 className="text-base font-semibold leading-6 text-zinc-900">Copy</h3>
          </div>
          <div className="p-6">
            <label className="block text-sm font-medium text-zinc-700">About Text</label>
            <textarea
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
              rows={6}
              className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm sm:text-sm p-2 border"
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

