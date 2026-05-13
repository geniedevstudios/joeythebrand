"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { dataStore } from "@/lib/dataStore";
import type { PromotionPopupConfig, PromotionPopupMediaKind, PromotionPopupAction, Product } from "@/lib/types";
import AssetUrlField from "@/components/AssetUrlField";
import AdminStyledSelect from "@/components/AdminStyledSelect";
import ConfirmDialog from "@/components/ConfirmDialog";
import { toast } from "sonner";

function newId(): string {
  if (typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  return `popup-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyDraft(): PromotionPopupConfig {
  return {
    id: newId(),
    enabled: true,
    mediaKind: "image",
    mediaUrl: "",
    posterUrl: "",
    headline: "",
    body: "",
    buttonLabel: "Learn more",
    action: "news",
    productSlugOrId: "",
  };
}

function truncate(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

const POPUP_MEDIA_OPTIONS: { value: PromotionPopupMediaKind; label: string }[] = [
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
];

const POPUP_ACTION_OPTIONS: { value: PromotionPopupAction; label: string }[] = [
  { value: "newsletter", label: "Scroll to newsletter (footer)" },
  { value: "product", label: "Product detail page" },
  { value: "news", label: "News & Blog page" },
];

const LABEL_CLASS = "block text-xs font-semibold uppercase tracking-wide text-zinc-600";
const FIELD_CLASS =
  "mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400";

function shopSegmentForProduct(p: Product): string {
  const slug = (p.slug ?? "").trim();
  return slug || p.id;
}

export default function PromotionPopupsEditor() {
  const [items, setItems] = useState<PromotionPopupConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PromotionPopupConfig>(() => emptyDraft());
  const [editingExisting, setEditingExisting] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [products]);

  const productSegmentSet = useMemo(
    () => new Set(sortedProducts.map(shopSegmentForProduct)),
    [sortedProducts]
  );

  const productPickValue = draft.productSlugOrId.trim();
  const productPickUnknown =
    Boolean(productPickValue) && draft.action === "product" && !productSegmentSet.has(productPickValue);

  const productPickerOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [
      { value: "", label: productsLoading ? "Loading products…" : "Select a product…" },
    ];
    const seen = new Set(opts.map((o) => o.value));
    if (productPickUnknown && productPickValue) {
      opts.push({ value: productPickValue, label: `Saved reference: ${productPickValue}` });
      seen.add(productPickValue);
    }
    for (const p of sortedProducts) {
      const seg = shopSegmentForProduct(p);
      if (seen.has(seg)) continue;
      seen.add(seg);
      const slugBit = p.slug?.trim() ? ` (${p.slug.trim()})` : "";
      opts.push({ value: seg, label: `${p.name}${slugBit}` });
    }
    return opts;
  }, [sortedProducts, productsLoading, productPickUnknown, productPickValue]);

  const load = useCallback(async () => {
    try {
      const data = await dataStore.getSiteContent();
      setItems((data.promotionPopups ?? []).map((r) => ({ ...r })));
    } catch (e) {
      console.error(e);
      toast.error("Could not load popup settings.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    setProductsLoading(true);
    void dataStore
      .getProducts()
      .then((list) => {
        if (!cancelled) setProducts(list);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) toast.error("Could not load products for picker.");
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persistList = async (next: PromotionPopupConfig[]) => {
    const cleaned = next.map((r) => ({
      ...r,
      mediaUrl: r.mediaUrl.trim(),
      posterUrl: r.mediaKind === "video" ? r.posterUrl.trim() : "",
      headline: r.headline.trim(),
      body: r.body.trim(),
      buttonLabel: (r.buttonLabel.trim() || "Learn more").trim(),
      productSlugOrId: r.productSlugOrId.trim(),
    }));
    await dataStore.updateSiteContent({ promotionPopups: cleaned });
    setItems(cleaned);
  };

  const openNew = () => {
    setDraft(emptyDraft());
    setEditingExisting(false);
    setEditorOpen(true);
  };

  const openEdit = (row: PromotionPopupConfig) => {
    setDraft({ ...row });
    setEditingExisting(true);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    if (saving) return;
    setEditorOpen(false);
  };

  const saveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.mediaUrl.trim() || !draft.headline.trim()) {
      toast.error("Media URL and headline are required.");
      return;
    }
    if (draft.action === "product" && !draft.productSlugOrId.trim()) {
      toast.error("Choose a product for the Product detail action.");
      return;
    }

    setSaving(true);
    try {
      const normalized: PromotionPopupConfig = {
        ...draft,
        mediaUrl: draft.mediaUrl.trim(),
        posterUrl: draft.mediaKind === "video" ? draft.posterUrl.trim() : "",
        headline: draft.headline.trim(),
        body: draft.body.trim(),
        buttonLabel: (draft.buttonLabel.trim() || "Learn more").trim(),
        productSlugOrId: draft.productSlugOrId.trim(),
      };

      let next: PromotionPopupConfig[];
      if (editingExisting) {
        next = items.map((r) => (r.id === normalized.id ? normalized : r));
      } else {
        next = [...items, normalized];
      }

      await persistList(next);
      toast.success(editingExisting ? "Popup updated." : "Popup added.");
      setEditorOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id: string) => {
    setSaving(true);
    try {
      const next = items.filter((r) => r.id !== id);
      await persistList(next);
      toast.success("Popup removed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete.");
      console.error(err);
    } finally {
      setSaving(false);
      setPendingDeleteId(null);
    }
  };

  const toggleEnabled = async (item: PromotionPopupConfig) => {
    setSaving(true);
    try {
      const next = items.map((r) => (r.id === item.id ? { ...r, enabled: !r.enabled } : r));
      await persistList(next);
      toast.success(item.enabled ? "Popup disabled." : "Popup enabled.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update status.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-zinc-200 bg-white text-sm text-zinc-800">
        Loading popup settings…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600">
        Full-screen promos after the shop loads (and again after each full refresh). Left: image or autoplay video; right:
        copy and button. If multiple are enabled, they will cycle automatically.
      </p>

      <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
        <div className="border-b border-zinc-200 px-6 py-5 bg-white flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold leading-6 text-zinc-900">Popups</h2>
          </div>
          <button
            type="button"
            onClick={openNew}
            disabled={saving}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            + New
          </button>
        </div>

        <div className="p-6">
          {items.length === 0 ? (
            <div className="text-sm text-zinc-600 text-center py-6">
              No popups created yet. Use <strong>+ New</strong> to add one.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((row) => (
                <div
                  key={row.id}
                  className="rounded-lg border border-zinc-200 bg-white p-4 flex flex-wrap gap-4 items-start justify-between"
                >
                  <div className="flex gap-4 min-w-0 flex-1 items-center">
                    <button
                      type="button"
                      onClick={() => toggleEnabled(row)}
                      className={`shrink-0 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold leading-4 ${
                        row.enabled ? "bg-green-100 text-green-800" : "bg-zinc-100 text-zinc-500"
                      }`}
                      title="Toggle active status"
                      disabled={saving}
                    >
                      {row.enabled ? "ACTIVE" : "INACTIVE"}
                    </button>
                    <div className="shrink-0 w-16 h-16 rounded-md border border-zinc-200 bg-zinc-100 overflow-hidden flex items-center justify-center">
                      {row.mediaUrl.trim() ? (
                        row.mediaKind === "video" ? (
                          <video
                            src={row.mediaUrl.trim()}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                            preload="metadata"
                            aria-hidden
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.mediaUrl.trim()}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )
                      ) : (
                        <span className="text-[10px] text-zinc-400 px-1 text-center">No media</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-zinc-900">{truncate(row.headline || "Untitled", 100)}</div>
                      <div className="mt-1 text-xs text-zinc-600">
                        <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-800 mr-2">
                          {row.mediaKind === "video" ? "Video" : "Image"}
                        </span>
                        <span>Action: {POPUP_ACTION_OPTIONS.find((o) => o.value === row.action)?.label || row.action}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
                      disabled={saving}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(row.id)}
                      className="rounded-md border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                      disabled={saving}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editorOpen ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            aria-hidden
            onClick={() => !saving && closeEditor()}
          />
          <div
            className="relative w-full max-w-xl max-h-[calc(100vh-2rem)] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex max-h-[calc(100vh-2rem)] flex-col">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 px-6 py-5">
                <h2 className="text-xl font-semibold text-zinc-900">
                  {editingExisting ? "Edit popup" : "New popup"}
                </h2>
                <button
                  type="button"
                  className="rounded-md border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
                  onClick={closeEditor}
                  disabled={saving}
                >
                  Close
                </button>
              </div>

              <form onSubmit={saveDraft} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                <div className="flex items-center gap-2">
                  <input
                    id="popup-enabled"
                    type="checkbox"
                    checked={draft.enabled}
                    onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
                    className="h-4 w-4 rounded border-zinc-300 text-zinc-900"
                  />
                  <label htmlFor="popup-enabled" className="text-sm font-medium text-zinc-900">
                    Enable this popup
                  </label>
                </div>

                <div>
                  <p id="popup-media-kind-label" className={LABEL_CLASS}>
                    Media type
                  </p>
                  <AdminStyledSelect
                    name="popup-media-kind"
                    labelledBy="popup-media-kind-label"
                    wrapperClassName="mt-1 w-full min-w-0"
                    defaultValue={draft.mediaKind}
                    options={POPUP_MEDIA_OPTIONS}
                    onValueChange={(v) => {
                      const mediaKind = v as PromotionPopupMediaKind;
                      setDraft((d) => ({
                        ...d,
                        mediaKind,
                        posterUrl: mediaKind === "image" ? "" : d.posterUrl,
                      }));
                    }}
                  />
                </div>

                <AssetUrlField
                  label={draft.mediaKind === "video" ? "Video URL" : "Image URL"}
                  value={draft.mediaUrl}
                  onChange={(url) => setDraft((d) => ({ ...d, mediaUrl: url }))}
                  uploadFolder="promotions/popup"
                  accept={draft.mediaKind === "video" ? "video/*" : "image/*"}
                  placeholder={draft.mediaKind === "video" ? "Upload or paste MP4 / WebM URL" : "Upload or paste image URL"}
                />

                {draft.mediaKind === "video" ? (
                  <AssetUrlField
                    label="Poster image (optional)"
                    value={draft.posterUrl}
                    onChange={(url) => setDraft((d) => ({ ...d, posterUrl: url }))}
                    uploadFolder="promotions/popup/posters"
                    accept="image/*"
                    placeholder="Still shown before playback"
                  />
                ) : null}

                <div>
                  <label htmlFor="popup-headline" className={LABEL_CLASS}>
                    Headline
                  </label>
                  <input
                    id="popup-headline"
                    type="text"
                    required
                    value={draft.headline}
                    onChange={(e) => setDraft((d) => ({ ...d, headline: e.target.value }))}
                    className={FIELD_CLASS}
                    placeholder="New collection"
                  />
                </div>

                <div>
                  <label htmlFor="popup-body" className={LABEL_CLASS}>
                    Body (optional)
                  </label>
                  <textarea
                    id="popup-body"
                    rows={4}
                    value={draft.body}
                    onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                    className={`${FIELD_CLASS} min-h-[6rem]`}
                    placeholder="Short message under the headline."
                  />
                </div>

                <div>
                  <label htmlFor="popup-button" className={LABEL_CLASS}>
                    Button label
                  </label>
                  <input
                    id="popup-button"
                    type="text"
                    value={draft.buttonLabel}
                    onChange={(e) => setDraft((d) => ({ ...d, buttonLabel: e.target.value }))}
                    className={FIELD_CLASS}
                    placeholder="Shop now"
                  />
                </div>

                <div>
                  <p id="popup-action-label" className={LABEL_CLASS}>
                    Button action
                  </p>
                  <AdminStyledSelect
                    name="popup-action"
                    labelledBy="popup-action-label"
                    wrapperClassName="mt-1 w-full min-w-0"
                    defaultValue={draft.action}
                    options={POPUP_ACTION_OPTIONS}
                    onValueChange={(v) =>
                      setDraft((d) => ({ ...d, action: v as PromotionPopupAction }))
                    }
                  />
                </div>

                {draft.action === "product" ? (
                  <div>
                    <p id="popup-product-label" className={LABEL_CLASS}>
                      Product
                    </p>
                    <AdminStyledSelect
                      name="popup-product"
                      labelledBy="popup-product-label"
                      wrapperClassName="mt-1 w-full min-w-0"
                      defaultValue={draft.productSlugOrId.trim()}
                      disabled={productsLoading}
                      options={productPickerOptions}
                      onValueChange={(v) => setDraft((d) => ({ ...d, productSlugOrId: v }))}
                    />
                    <p className="mt-1 text-xs text-zinc-500">
                      Opens the product detail route using each product&apos;s slug when set, otherwise its ID.
                    </p>
                  </div>
                ) : null}

                <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-zinc-100 mt-6">
                  <button
                    type="button"
                    className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                    onClick={closeEditor}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete this popup?"
        description="This popup will be removed permanently. This cannot be undone."
        confirmLabel="Delete popup"
        variant="danger"
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={async () => {
          if (pendingDeleteId) await deleteItem(pendingDeleteId);
        }}
      />
    </div>
  );
}
