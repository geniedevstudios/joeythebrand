"use client";

import { useCallback, useEffect, useState } from "react";
import { dataStore } from "@/lib/dataStore";
import type { NewsSpotlightItem } from "@/lib/types";
import AssetUrlField from "@/components/AssetUrlField";
import { toast } from "sonner";

function newId(): string {
  if (typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  return `news-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyDraft(): NewsSpotlightItem {
  return {
    id: newId(),
    snapshotUrl: "",
    snapshotKind: "image",
    destinationUrl: "",
    description: "",
    buttonLabel: "Watch full video",
  };
}

function truncate(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url.trim()).hostname.replace(/^www\./, "");
  } catch {
    return truncate(url.trim(), 48);
  }
}

export default function NewsSpotlightsEditor() {
  const [items, setItems] = useState<NewsSpotlightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<NewsSpotlightItem>(() => emptyDraft());
  /** True when editing an item that already exists in `items` */
  const [editingExisting, setEditingExisting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await dataStore.getSiteContent();
      setItems((data.newsSpotlights ?? []).map((r) => ({ ...r })));
    } catch (e) {
      console.error(e);
      toast.error("Could not load News & Blog items.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const persistList = async (next: NewsSpotlightItem[]) => {
    const cleaned = next
      .map((r) => ({
        ...r,
        snapshotUrl: r.snapshotUrl.trim(),
        destinationUrl: r.destinationUrl.trim(),
        description: r.description.trim(),
        buttonLabel: (r.buttonLabel.trim() || "Watch full video").trim(),
      }))
      .filter((r) => r.snapshotUrl && r.destinationUrl);
    await dataStore.updateSiteContent({ newsSpotlights: cleaned });
    setItems(cleaned);
  };

  const openNew = () => {
    setDraft(emptyDraft());
    setEditingExisting(false);
    setEditorOpen(true);
  };

  const openEdit = (row: NewsSpotlightItem) => {
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
    const snapshotUrl = draft.snapshotUrl.trim();
    const destinationUrl = draft.destinationUrl.trim();
    if (!snapshotUrl || !destinationUrl) {
      toast.error("Snapshot and destination URL are required.");
      return;
    }

    setSaving(true);
    try {
      const normalized: NewsSpotlightItem = {
        ...draft,
        snapshotUrl,
        destinationUrl,
        description: draft.description.trim(),
        buttonLabel: (draft.buttonLabel.trim() || "Watch full video").trim(),
      };

      let next: NewsSpotlightItem[];
      if (editingExisting) {
        next = items.map((r) => (r.id === normalized.id ? normalized : r));
      } else {
        next = [...items, normalized];
      }

      await persistList(next);
      toast.success(editingExisting ? "Teaser updated." : "Teaser added.");
      setEditorOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id: string) => {
    if (!window.confirm("Remove this teaser from the site?")) return;
    setSaving(true);
    try {
      const next = items.filter((r) => r.id !== id);
      await persistList(next);
      toast.success("Teaser removed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-6 py-8 text-sm text-zinc-600">
        Loading…
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
        <div className="border-b border-zinc-200 px-6 py-5 bg-white flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold leading-6 text-zinc-900">Teasers</h2>
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
            <div className="text-sm text-zinc-600">No teasers yet. Use <strong>+ New</strong> to add one.</div>
          ) : (
            <div className="space-y-3">
              {items.map((row) => {
                const summary =
                  row.description.trim() ||
                  row.buttonLabel.trim() ||
                  "Teaser";
                const dest = row.destinationUrl.trim();
                return (
                  <div
                    key={row.id}
                    className="rounded-lg border border-zinc-200 bg-white p-4 flex flex-wrap gap-4 items-start justify-between"
                  >
                    <div className="flex gap-4 min-w-0 flex-1">
                      <div className="shrink-0 w-28 h-16 rounded-md border border-zinc-200 bg-zinc-100 overflow-hidden flex items-center justify-center">
                        {row.snapshotUrl.trim() ? (
                          row.snapshotKind === "video" ? (
                            <video
                              src={row.snapshotUrl.trim()}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                              preload="metadata"
                              aria-hidden
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={row.snapshotUrl.trim()}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          )
                        ) : (
                          <span className="text-[10px] text-zinc-400 px-1 text-center">No media</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-zinc-900">{truncate(summary, 100)}</div>
                        <div className="mt-1 text-xs text-zinc-600">
                          <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-800 mr-2">
                            {row.snapshotKind === "video" ? "Video" : "Image"}
                          </span>
                          {dest ? (
                            <span className="break-all" title={dest}>
                              → {hostFromUrl(dest)}
                            </span>
                          ) : (
                            <span className="text-amber-700">No destination URL</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
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
                        onClick={() => void deleteItem(row.id)}
                        className="rounded-md border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                        disabled={saving}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
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
            className="relative w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex max-h-[calc(100vh-2rem)] flex-col">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 px-6 py-5">
                <h2 className="text-xl font-semibold text-zinc-900">
                  {editingExisting ? "Edit teaser" : "New teaser"}
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

              <form onSubmit={saveDraft} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <div className="flex flex-wrap gap-4">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="snap-kind"
                      checked={draft.snapshotKind === "image"}
                      onChange={() => setDraft((d) => ({ ...d, snapshotKind: "image" }))}
                    />
                    Image
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="snap-kind"
                      checked={draft.snapshotKind === "video"}
                      onChange={() => setDraft((d) => ({ ...d, snapshotKind: "video" }))}
                    />
                    Video clip
                  </label>
                </div>

                <AssetUrlField
                  label={draft.snapshotKind === "video" ? "Teaser video URL" : "Teaser image URL"}
                  value={draft.snapshotUrl}
                  onChange={(v) => setDraft((d) => ({ ...d, snapshotUrl: v }))}
                  uploadFolder="site/news-snapshots"
                  accept={draft.snapshotKind === "video" ? "video/*" : "image/*"}
                  placeholder="Upload or paste URL"
                />

                <label className="block">
                  <span className="text-sm font-medium text-zinc-900">Destination URL</span>
                  <input
                    type="url"
                    required
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                    value={draft.destinationUrl}
                    onChange={(e) => setDraft((d) => ({ ...d, destinationUrl: e.target.value }))}
                    placeholder="https://…"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-900">Description</span>
                  <textarea
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 min-h-[6rem]"
                    value={draft.description}
                    onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                    placeholder="Copy shown beside the teaser"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-900">Button label</span>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                    value={draft.buttonLabel}
                    onChange={(e) => setDraft((d) => ({ ...d, buttonLabel: e.target.value }))}
                    placeholder="Watch full video"
                  />
                </label>

                <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-zinc-100">
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
    </>
  );
}
