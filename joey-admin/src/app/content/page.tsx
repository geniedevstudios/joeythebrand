"use client";

import { useEffect, useState } from "react";
import { dataStore } from "@/lib/dataStore";
import type { SiteContent } from "@/lib/types";

export default function ContentPage() {
  const [content, setContent] = useState<SiteContent | null>(null);

  useEffect(() => {
    setContent(dataStore.getSiteContent());
    const unsubscribe = dataStore.subscribe(() => {
      setContent(dataStore.getSiteContent());
    });
    return unsubscribe;
  }, []);

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    dataStore.updateSiteContent({
      heroImage: formData.get("heroImage") as string,
      heroTitle: formData.get("heroTitle") as string,
      heroSubtitle: formData.get("heroSubtitle") as string,
      aboutImage: formData.get("aboutImage") as string,
      aboutText: formData.get("aboutText") as string,
    });
    
    alert("Site content updated successfully!");
  };

  if (!content) return <div>Loading...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Site Content</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="border-b border-zinc-200 px-6 py-5 bg-white">
            <h3 className="text-base font-semibold leading-6 text-zinc-900">Hero Section</h3>
            <p className="mt-1 text-sm text-zinc-500">This is the first thing users see when they land on the home page.</p>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Hero Image URL</label>
              <div className="mt-2 flex items-center space-x-4">
                <img src={content.heroImage} alt="Hero Preview" className="h-20 w-32 object-cover rounded shadow-sm border" />
                <input type="text" name="heroImage" defaultValue={content.heroImage} className="block w-full rounded-md border-zinc-300 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 sm:text-sm p-2 border" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Hero Title</label>
              <input type="text" name="heroTitle" defaultValue={content.heroTitle} className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 sm:text-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Hero Subtitle</label>
              <input type="text" name="heroSubtitle" defaultValue={content.heroSubtitle} className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 sm:text-sm p-2 border" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="border-b border-zinc-200 px-6 py-5 bg-white">
            <h3 className="text-base font-semibold leading-6 text-zinc-900">About / Founder Section</h3>
            <p className="mt-1 text-sm text-zinc-500">The introduction and story of Joey The Brand.</p>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-700">About Image URL</label>
              <div className="mt-2 flex items-center space-x-4">
                <img src={content.aboutImage} alt="About Preview" className="h-24 w-20 object-cover rounded shadow-sm border" />
                <input type="text" name="aboutImage" defaultValue={content.aboutImage} className="block w-full rounded-md border-zinc-300 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 sm:text-sm p-2 border" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">About Text</label>
              <textarea name="aboutText" rows={4} defaultValue={content.aboutText} className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 sm:text-sm p-2 border" />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="rounded-md bg-zinc-950 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950">
            Save All Changes
          </button>
        </div>
      </form>
    </div>
  );
}
