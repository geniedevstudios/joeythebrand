"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { isStaticHeaderPageHeroKey, PAGE_HERO_KEYS, PAGE_HERO_LABELS } from "@/lib/pageHeroes";
import type { PageHeroKey } from "@/lib/types";
import { PageHeroEditor } from "@/components/PageHeroEditor";

function isPageHeroKey(v: string): v is PageHeroKey {
  return (PAGE_HERO_KEYS as string[]).includes(v);
}

export default function SingleHeroPage() {
  const params = useParams<{ key?: string }>();
  const rawKey = params?.key ? String(params.key) : "";
  const heroKey = useMemo(
    () => (isPageHeroKey(rawKey) ? (rawKey as PageHeroKey) : null),
    [rawKey],
  );

  if (!heroKey || heroKey === "home" || isStaticHeaderPageHeroKey(heroKey)) {
    return (
      <div className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Unknown page</h2>
        <p className="text-sm text-zinc-800">
          Pick one of the pages in the tabs above, or go back to{" "}
          <Link href="/content/app-pages/home" className="underline">
            Home
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
          {PAGE_HERO_LABELS[heroKey]}
        </h2>
        <p className="mt-1 text-sm text-zinc-800">These appear on this page.</p>
      </div>
      <PageHeroEditor heroKey={heroKey} />
    </div>
  );
}
