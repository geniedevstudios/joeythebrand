"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { uploadSiteAsset } from "@/lib/uploadSiteAsset";
import { compressImageIfNeeded } from "@/lib/compressImageClient";

type Props = {
  id?: string;
  label: string;
  value: string;
  onChange: (url: string) => void;
  /** Subfolder inside the site-assets bucket, e.g. "heroes/home" or "about" */
  uploadFolder: string;
  accept: string;
  placeholder?: string;
};

export default function AssetUrlField({
  id,
  label,
  value,
  onChange,
  uploadFolder,
  accept,
  placeholder = "https://… or /path/from/public.jpg",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  /** Blob URL while uploading (image or video) */
  const [localPreview, setLocalPreview] = useState<string>("");

  const isImage = useMemo(() => accept.includes("image"), [accept]);
  const isVideo = useMemo(() => accept.includes("video"), [accept]);
  /** Image-only or video-only pickers hide the URL field (preview + upload only). */
  const hideUrlField = isImage || (isVideo && !isImage);

  const previewSrc = localPreview || value;

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadErr("");
    let blobToRevoke = "";
    try {
      if (isImage || isVideo) {
        const blob = URL.createObjectURL(file);
        blobToRevoke = blob;
        setLocalPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return blob;
        });
      }
      const prepared = isImage ? await compressImageIfNeeded(file) : file;
      const url = await uploadSiteAsset(prepared, uploadFolder);
      onChange(url);
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (blobToRevoke) URL.revokeObjectURL(blobToRevoke);
      setLocalPreview("");
    }
  };

  return (
    <div>
      <label htmlFor={hideUrlField ? undefined : id} className="block text-sm font-medium text-zinc-700">
        {label}
      </label>
      <div className="mt-1 flex flex-col gap-3">
        {hideUrlField && isImage ? (
          <div className="relative w-full max-w-[160px]">
            <div
              role="button"
              tabIndex={0}
              onClick={() => !uploading && inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (!uploading) inputRef.current?.click();
                }
              }}
              className={`group relative aspect-square w-full cursor-pointer overflow-hidden rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 text-zinc-600 shadow-sm transition-colors hover:border-zinc-400 hover:bg-zinc-100 ${uploading ? "opacity-50" : ""}`}
              aria-disabled={uploading}
              aria-label={previewSrc ? "Change image" : "Add image"}
            >
              {previewSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewSrc} alt="" className="h-full w-full object-cover" decoding="async" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                  <span className="text-2xl font-light leading-none text-zinc-700">+</span>
                  <span className="text-xs font-medium text-zinc-600">{uploading ? "Uploading…" : "Add Photo"}</span>
                </div>
              )}
              {uploading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/25 text-[11px] font-semibold uppercase tracking-wide text-white">
                  Uploading…
                </div>
              ) : null}
              {previewSrc ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/40 px-2 py-1 text-center text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                  Change
                </div>
              ) : null}
            </div>
            {previewSrc ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
                className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/75 text-sm font-semibold text-white shadow-md ring-1 ring-white/20 hover:bg-red-900/90"
                aria-label="Remove image"
              >
                ×
              </button>
            ) : null}
          </div>
        ) : hideUrlField && isVideo ? (
          <div className="relative w-full max-w-[280px]">
            <div
              role="button"
              tabIndex={0}
              onClick={() => !uploading && inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (!uploading) inputRef.current?.click();
                }
              }}
              className={`group relative aspect-video w-full cursor-pointer overflow-hidden rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-950 text-zinc-600 shadow-sm transition-colors hover:border-zinc-400 hover:bg-zinc-900 ${uploading ? "opacity-50" : ""}`}
              aria-disabled={uploading}
              aria-label={previewSrc ? "Change video" : "Add video"}
            >
              {previewSrc ? (
                <video
                  src={previewSrc}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : (
                <div className="flex h-full min-h-[120px] w-full flex-col items-center justify-center gap-2 px-4">
                  <span className="text-2xl font-light leading-none text-zinc-100">+</span>
                  <span className="text-xs font-medium text-zinc-200">{uploading ? "Uploading…" : "Add video"}</span>
                </div>
              )}
              {uploading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-[11px] font-semibold uppercase tracking-wide text-white">
                  Uploading…
                </div>
              ) : null}
              {previewSrc ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/50 px-2 py-1 text-center text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                  Change
                </div>
              ) : null}
            </div>
            {previewSrc ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
                className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/75 text-sm font-semibold text-white shadow-md ring-1 ring-white/20 hover:bg-red-900/90"
                aria-label="Remove video"
              >
                ×
              </button>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              id={id}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="block w-full min-w-0 flex-1 rounded-md border border-zinc-300 p-2 text-sm shadow-sm"
              placeholder={placeholder}
            />
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Choose file"}
              </button>
            </div>
          </div>
        )}

        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
      </div>
      {uploadErr && <p className="mt-1 text-xs text-red-600">{uploadErr}</p>}
    </div>
  );
}
