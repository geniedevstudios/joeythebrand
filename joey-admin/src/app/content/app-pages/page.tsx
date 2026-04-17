"use client";

import Link from "next/link";
import { PAGE_HERO_KEYS, PAGE_HERO_LABELS } from "@/lib/pageHeroes";

const cards = [
  { id: "homeHero", label: "Home — hero background", href: "/content/app-pages/home-hero" },
  { id: "events", label: "Events page", href: "/content/app-pages/events" },
];

export default function AppPagesContent() {
  return (
    <div className="w-full max-w-none space-y-6">
      <div>
        <nav className="mb-2 text-sm text-zinc-800">
          <Link href="/content" className="hover:text-zinc-900">
            Site Content
          </Link>
          <span className="mx-2 text-zinc-300">/</span>
          <span className="font-medium text-zinc-900">App pages</span>
        </nav>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">App pages</h1>
        <p className="mt-1 text-sm text-zinc-900">
          Jump into the section you want to edit.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.id}
            href={c.href}
            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="text-sm font-semibold text-zinc-900">{c.label}</div>
            <div className="mt-2 text-xs text-zinc-800">Open editor</div>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Page hero fields</h2>
        <p className="mt-1 text-sm text-zinc-900">
          Each page hero has its own editor.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PAGE_HERO_KEYS.filter((k) => k !== "home").map((k) => (
            <Link
              key={k}
              href={`/content/app-pages/heroes/${k}`}
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 hover:bg-zinc-100 transition-colors"
            >
              <div className="text-sm font-medium text-zinc-900">{PAGE_HERO_LABELS[k]}</div>
              <div className="mt-1 text-xs text-zinc-800">{k}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

