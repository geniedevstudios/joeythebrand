"use client";

import { useMemo, useRef, useState } from "react";
import { uploadSiteAsset } from "@/lib/uploadSiteAsset";
import { compressImageIfNeeded } from "@/lib/compressImageClient";

type Props = {
  label: string;
  value: string[];
  onChange: (urls: string[]) => void;
  uploadFolder: string;
  accept: string;
};

export default function AssetGalleryField({ label, value, onChange, uploadFolder, accept }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  /** 'add' = append; number = replace at index */
  const [pickMode, setPickMode] = useState<"add" | number>("add");
  /** Blob URLs shown immediately while new files upload */
  const [stagedBlobUrls, setStagedBlobUrls] = useState<string[]>([]);
  /** Blob URL over a row while replacing */
  const [replaceBlob, setReplaceBlob] = useState<{ idx: number; url: string } | null>(null);

  const urls = useMemo(
    () => (Array.isArray(value) ? value.map((u) => String(u || "").trim()).filter(Boolean) : []),
    [value],
  );

  const openPicker = (mode: "add" | number) => {
    setPickMode(mode);
    requestAnimationFrame(() => inputRef.current?.click());
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;

    setBusy(true);
    setErr("");
    try {
      if (pickMode === "add") {
        const blobUrls = files.map((f) => URL.createObjectURL(f));
        setStagedBlobUrls((prev) => [...prev, ...blobUrls]);
        try {
          const prepared = await Promise.all(files.map((f) => compressImageIfNeeded(f)));
          const uploaded = await Promise.all(prepared.map((f) => uploadSiteAsset(f, uploadFolder)));
          onChange([...urls, ...uploaded]);
        } finally {
          blobUrls.forEach((u) => URL.revokeObjectURL(u));
          setStagedBlobUrls((prev) => prev.slice(0, Math.max(0, prev.length - blobUrls.length)));
        }
      } else {
        const idx = pickMode as number;
        const file = files[0];
        if (!file) return;
        const local = URL.createObjectURL(file);
        setReplaceBlob({ idx, url: local });
        try {
          const prepared = await compressImageIfNeeded(file);
          const remote = await uploadSiteAsset(prepared, uploadFolder);
          const next = [...urls];
          if (idx >= 0 && idx < next.length) {
            next[idx] = remote;
            onChange(next);
          }
        } finally {
          URL.revokeObjectURL(local);
          setReplaceBlob(null);
        }
      }
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const removeAt = (idx: number) => {
    onChange(urls.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700">{label}</label>
      <p className="mt-1 text-sm text-zinc-700">Tap a photo to replace it. Use the × button to remove.</p>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={pickMode === "add"}
        className="hidden"
        onChange={handleFileChange}
      />

      {err ? <p className="mt-2 text-xs text-red-600">{err}</p> : null}

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {urls.map((u, idx) => (
          <div
            key={`${u}-${idx}`}
            className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm"
          >
            <button
              type="button"
              disabled={busy}
              onClick={() => openPicker(idx)}
              className="absolute inset-0 z-0"
              aria-label="Change photo"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={replaceBlob?.idx === idx ? replaceBlob.url : u}
              alt=""
              className="pointer-events-none h-full w-full object-cover"
              decoding="async"
              loading="lazy"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeAt(idx);
              }}
              className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/75 text-sm font-semibold text-white shadow-md ring-1 ring-white/20 hover:bg-red-900/90"
              aria-label="Remove photo"
            >
              ×
            </button>
            {busy && replaceBlob?.idx === idx ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 text-[11px] font-semibold uppercase tracking-wide text-white">
                Uploading…
              </div>
            ) : null}
          </div>
        ))}

        {stagedBlobUrls.map((b, i) => (
          <div
            key={`staged-${i}-${b.slice(-12)}`}
            className="relative aspect-square overflow-hidden rounded-lg border border-amber-200 bg-amber-50/40 shadow-sm ring-1 ring-amber-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b} alt="" className="h-full w-full object-cover" decoding="async" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/25 text-[11px] font-semibold uppercase tracking-wide text-white">
              Uploading…
            </div>
          </div>
        ))}

        <button
          type="button"
          disabled={busy}
          onClick={() => openPicker("add")}
          className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 text-zinc-600 transition-colors hover:border-zinc-400 hover:bg-zinc-100 disabled:opacity-50"
        >
          <span className="text-2xl font-light leading-none text-zinc-700">+</span>
          <span className="text-xs font-medium text-zinc-600">{busy ? "Working…" : "Add Photo"}</span>
        </button>
      </div>

      {urls.length > 0 ? (
        <p className="mt-2 text-xs text-zinc-700">{urls.length} photo{urls.length === 1 ? "" : "s"}</p>
      ) : null}
    </div>
  );
}
