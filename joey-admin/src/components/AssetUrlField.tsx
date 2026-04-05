"use client";

import { useRef, useState } from "react";
import { uploadSiteAsset } from "@/lib/uploadSiteAsset";

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
  placeholder = "https://… or /hero.png",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadErr("");
    try {
      const url = await uploadSiteAsset(file, uploadFolder);
      onChange(url);
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-zinc-700">
        {label}
      </label>
      <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="block w-full min-w-0 flex-1 rounded-md border border-zinc-300 p-2 text-sm shadow-sm"
          placeholder={placeholder}
        />
        <div className="flex shrink-0 gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleFile}
          />
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
      {uploadErr && (
        <p className="mt-1 text-xs text-red-600">{uploadErr}</p>
      )}
    </div>
  );
}
