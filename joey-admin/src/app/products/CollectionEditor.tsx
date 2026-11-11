"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import type { Collection, Product } from "@/lib/types";
import { dataStore } from "@/lib/dataStore";
import AssetUrlField from "@/components/AssetUrlField";
import AssetGalleryField from "@/components/AssetGalleryField";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FIELD =
  "mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm";
const LABEL = "block text-sm font-medium text-zinc-700";
const HINT = "mt-0.5 text-xs text-zinc-500";

function sanitizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isMadeToOrder(product: Product) {
  return product.fulfillmentMode === "made_to_order_only";
}

export default function CollectionEditor({
  open,
  collection,
  products,
  collections,
  onClose,
  onSaved,
}: {
  open: boolean;
  collection: Collection | null;
  products: Product[];
  collections: Collection[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [name, setName] = useState("");
  const [briefDescription, setBriefDescription] = useState("");
  const [description, setDescription] = useState("");
  const [statementEyebrow, setStatementEyebrow] = useState("");
  const [detailWriteup, setDetailWriteup] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [image, setImage] = useState("");
  const [image2, setImage2] = useState("");
  const [image3, setImage3] = useState("");
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [detailVideoUrl, setDetailVideoUrl] = useState("");
  const [detailVideoPosterUrl, setDetailVideoPosterUrl] = useState("");
  const [detailGalleryUrls, setDetailGalleryUrls] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const rtwProducts = useMemo(
    () => products.filter((p) => !isMadeToOrder(p)),
    [products],
  );

  const workingSlug = collection?.slug || sanitizeSlug(name) || "draft";
  const galleryFolder = `collections/${workingSlug}/gallery`;
  const detailGalleryFolder = `collections/${workingSlug}/detail-gallery`;

  useEffect(() => {
    if (!open) return;
    if (collection) {
      setName(collection.name);
      setBriefDescription(collection.briefDescription || "");
      setDescription(collection.description || "");
      const writeup = String(collection.detailWriteup ?? "").trim();
      const lines = writeup.split("\n");
      const maybeEyebrow = lines[0]?.trim() || "";
      const looksLikeEyebrow =
        maybeEyebrow.length > 0 &&
        maybeEyebrow.length <= 48 &&
        lines.length > 1 &&
        !maybeEyebrow.includes(".");
      setStatementEyebrow(looksLikeEyebrow ? maybeEyebrow : "");
      setDetailWriteup(looksLikeEyebrow ? lines.slice(1).join("\n") : writeup);
      setSortOrder(collection.sortOrder ?? 0);
      setImage(collection.image?.trim() || "");
      setImage2(collection.image2 || "");
      setImage3(collection.image3 || "");
      setGalleryUrls(collection.galleryUrls ?? []);
      setDetailVideoUrl(String(collection.detailVideoUrl ?? ""));
      setDetailVideoPosterUrl(String(collection.detailVideoPosterUrl ?? ""));
      setDetailGalleryUrls(
        (collection.detailGalleryUrls ?? []).map((u) => String(u || "").trim()).filter(Boolean),
      );
      setSelectedIds(
        products
          .filter((p) => !isMadeToOrder(p) && p.category === collection.slug)
          .map((p) => p.id),
      );
    } else {
      setName("");
      setBriefDescription("");
      setDescription("");
      setStatementEyebrow("");
      setDetailWriteup("");
      setSortOrder(0);
      setImage("");
      setImage2("");
      setImage3("");
      setGalleryUrls([]);
      setDetailVideoUrl("");
      setDetailVideoPosterUrl("");
      setDetailGalleryUrls([]);
      setSelectedIds([]);
    }
    setError("");
  }, [open, collection, products]);

  if (!open) return null;

  const save = async () => {
    setSaving(true);
    setError("");
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Add a collection label.");
      setSaving(false);
      return;
    }
    if (!image.trim()) {
      setError("Upload a collection image.");
      setSaving(false);
      return;
    }

    const slug = collection?.slug || sanitizeSlug(trimmedName);
    if (!slug || !SLUG_PATTERN.test(slug)) {
      setError("Could not build a URL slug from the collection label.");
      setSaving(false);
      return;
    }

    const writeup = [statementEyebrow.trim(), detailWriteup.trim()]
      .filter(Boolean)
      .join("\n");

    const payload = {
      name: trimmedName,
      briefDescription: briefDescription.trim(),
      description: description.trim(),
      sortOrder: Number(sortOrder) || 0,
      image: image.trim(),
      image2: image2.trim(),
      image3: image3.trim(),
      galleryUrls: galleryUrls.map((u) => String(u || "").trim()).filter(Boolean),
      detailWriteup: writeup,
      detailVideoUrl: detailVideoUrl.trim(),
      detailVideoPosterUrl: detailVideoPosterUrl.trim(),
      detailGalleryUrls: detailGalleryUrls.map((u) => String(u || "").trim()).filter(Boolean),
    };

    try {
      if (collection) {
        await dataStore.updateCollection(collection.id, payload);
      } else {
        await dataStore.addCollection({ slug, ...payload });
      }

      const previousIds = new Set(
        collection
          ? products
              .filter((p) => !isMadeToOrder(p) && p.category === collection.slug)
              .map((p) => p.id)
          : [],
      );
      const nextIds = new Set(selectedIds);

      for (const id of nextIds) {
        if (previousIds.has(id)) continue;
        const product = products.find((p) => p.id === id);
        if (!product) continue;
        await dataStore.updateProduct(id, {
          category: slug,
          categoryName: trimmedName,
        });
      }
      for (const id of previousIds) {
        if (nextIds.has(id)) continue;
        await dataStore.updateProduct(id, {
          category: "none",
          categoryName: "",
        });
      }

      toast.success(collection ? "Collection updated." : "Collection created.");
      await onSaved();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save collection.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90dvh] min-h-0 w-full max-w-[930px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-5">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Shape your collection
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              <label className="block">
                <span className={LABEL}>Collection label</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className={FIELD} />
              </label>

              <label className="block">
                <span className={LABEL}>Introduction</span>
                <p className={HINT}>Home, shop cards, and the hero line on the collection page.</p>
                <textarea
                  rows={3}
                  value={briefDescription}
                  onChange={(e) => setBriefDescription(e.target.value)}
                  className={FIELD}
                />
              </label>

              <label className="block">
                <span className={LABEL}>Headline / story</span>
                <p className={HINT}>Full story on the collection detail page.</p>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={FIELD}
                />
              </label>

              <label className="block">
                <span className={LABEL}>Between the banner and the pieces</span>
                <p className={HINT}>The small heading above the statement.</p>
                <input
                  value={statementEyebrow}
                  onChange={(e) => setStatementEyebrow(e.target.value)}
                  className={FIELD}
                />
              </label>

              <label className="block">
                <span className={LABEL}>Statement</span>
                <p className={HINT}>Shown below the first gallery on the collection page.</p>
                <textarea
                  rows={3}
                  value={detailWriteup}
                  onChange={(e) => setDetailWriteup(e.target.value)}
                  className={FIELD}
                />
              </label>

              <AssetUrlField
                id="col-image"
                label="Collection image"
                value={image}
                onChange={setImage}
                uploadFolder="collections"
                accept="image/*"
              />

              <details className="rounded-lg border border-zinc-200 bg-zinc-50 open:bg-white">
                <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-zinc-900">
                  More imagery (optional)
                </summary>
                <div className="space-y-4 border-t border-zinc-200 p-4">
                  <AssetUrlField
                    id="col-image2"
                    label="Secondary image 1"
                    value={image2}
                    onChange={setImage2}
                    uploadFolder="collections"
                    accept="image/*"
                  />
                  <AssetUrlField
                    id="col-image3"
                    label="Secondary image 2"
                    value={image3}
                    onChange={setImage3}
                    uploadFolder="collections"
                    accept="image/*"
                  />
                  <AssetGalleryField
                    label="Collection page gallery"
                    value={galleryUrls}
                    onChange={setGalleryUrls}
                    uploadFolder={galleryFolder}
                    accept="image/*"
                  />
                  <AssetUrlField
                    id="col-detail-video"
                    label="Detail video"
                    value={detailVideoUrl}
                    onChange={setDetailVideoUrl}
                    uploadFolder="collections"
                    accept="video/*"
                  />
                  <AssetUrlField
                    id="col-detail-video-poster"
                    label="Detail video poster"
                    value={detailVideoPosterUrl}
                    onChange={setDetailVideoPosterUrl}
                    uploadFolder="collections"
                    accept="image/*"
                  />
                  <AssetGalleryField
                    label="More images (after video)"
                    value={detailGalleryUrls}
                    onChange={setDetailGalleryUrls}
                    uploadFolder={detailGalleryFolder}
                    accept="image/*"
                  />
                </div>
              </details>

              <label className="block max-w-[10rem]">
                <span className={LABEL}>Sort order</span>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                  className={FIELD}
                />
              </label>
            </div>

            <div>
              <h3 className="text-base font-semibold text-zinc-900">Pieces in this collection</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                Choose from your ready-to-wear products in the order you’d like them to appear. A
                piece already in another collection stays there. Made-to-order designs are managed
                separately.
              </p>

              {!rtwProducts.length ? (
                <p className="mt-4 text-sm text-zinc-500">
                  Add a ready-to-wear product first, then select it here.
                </p>
              ) : (
                <div className="mt-4 space-y-2">
                  {rtwProducts.map((p) => {
                    const home = collections.find(
                      (c) =>
                        c.slug !== collection?.slug &&
                        p.category === c.slug,
                    );
                    const selected = selectedIds.includes(p.id);
                    const taken = Boolean(home) && !selected;
                    return (
                      <label
                        key={p.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 ${
                          taken
                            ? "cursor-not-allowed border-zinc-100 bg-zinc-50 opacity-60"
                            : selected
                              ? "border-zinc-900 bg-zinc-50"
                              : "border-zinc-200 bg-white hover:border-zinc-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={taken}
                          onChange={(e) => {
                            if (taken) return;
                            setSelectedIds((ids) =>
                              e.target.checked
                                ? [...ids, p.id]
                                : ids.filter((id) => id !== p.id),
                            );
                          }}
                          className="rounded border-zinc-300"
                        />
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-zinc-100">
                          {p.image?.trim() ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image.trim()} alt="" className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-zinc-900">
                            {p.name}
                          </span>
                          <small className="block text-xs text-zinc-500">
                            {p.categoryName || p.category || "Unassigned"}
                            {p.isPublished === false ? " · Draft" : ""}
                            {taken ? ` · In ${home?.name}` : ""}
                          </small>
                        </span>
                        {selected ? (
                          <span className="text-xs font-semibold text-zinc-500">
                            {selectedIds.indexOf(p.id) + 1}
                          </span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {error ? (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-zinc-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {saving ? "Saving…" : collection ? "Save" : "Create collection"}
          </button>
        </div>
      </div>
    </div>
  );
}
