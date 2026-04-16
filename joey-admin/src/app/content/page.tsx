"use client";

import Link from "next/link";

export default function ContentPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Site Content</h1>
          <p className="mt-2 text-sm text-zinc-900">
            Choose what you want to edit.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/content/app-pages"
          className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="text-sm font-semibold text-zinc-900">App pages</div>
          <div className="mt-2 text-xs text-zinc-800">Hero backgrounds, About section</div>
        </Link>
        <Link
          href="/content/consultations"
          className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="text-sm font-semibold text-zinc-900">Consultations</div>
          <div className="mt-2 text-xs text-zinc-800">Review requests, confirm booking codes</div>
        </Link>
        <Link
          href="/content/newsletter"
          className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="text-sm font-semibold text-zinc-900">Newsletter</div>
          <div className="mt-2 text-xs text-zinc-800">Send list updates via Brevo</div>
        </Link>
      </div>
    </div>
  );
}
