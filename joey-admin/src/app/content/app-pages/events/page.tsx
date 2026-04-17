"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import AssetUrlField from "@/components/AssetUrlField";
import AssetGalleryField from "@/components/AssetGalleryField";

type EventsPageRow = {
  id: number;
  heading: string | null;
  subheading: string | null;
  body: string | null;
  top_video_url?: string | null;
  top_video_poster_url?: string | null;
  updated_at?: string | null;
};

type EventCategory = "fashion_shows" | "clan_festival";
type EventStatus = "upcoming" | "past";

type EventRow = {
  id: string;
  slug: string;
  title: string;
  category: EventCategory | string;
  status: EventStatus | string;
  location: string | null;
  start_at: string | null;
  date_label: string | null;
  description: string | null;
  details: string | null;
  details_ready: boolean | null;
  main_video_url: string | null;
  main_video_poster_url: string | null;
  flyer_url: string | null;
  gallery_urls: string[] | null;
  recap_youtube_url: string | null;
  pixieset_url: string | null;
  collection_slugs: string[] | null;
  sort_order: number | null;
  updated_at?: string | null;
};

type DraftEvent = {
  id?: string;
  slug: string;
  title: string;
  category: EventCategory;
  status: EventStatus;
  location: string;
  startAt: string; // datetime-local
  dateLabel: string;
  description: string;
  detailsReady: boolean;
  details: string;
  flyerUrl: string;
  showVideoUrl: string;
  showVideoPosterUrl: string;
  galleryUrls: string[];
  recapYoutubeUrl: string;
  pixiesetUrl: string;
  collectionSlugsCsv: string;
  sortOrder: number;
};

function sanitizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseCollectionSlugs(csv: string): string[] {
  return csv
    .split(",")
    .map((s) => sanitizeSlug(s))
    .filter(Boolean);
}

function toDraft(row?: EventRow | null): DraftEvent {
  return {
    id: row?.id,
    slug: row?.slug ?? "",
    title: row?.title ?? "",
    category: row?.category === "clan_festival" ? "clan_festival" : "fashion_shows",
    status: row?.status === "past" ? "past" : "upcoming",
    location: row?.location ?? "",
    startAt: row?.start_at ? new Date(row.start_at).toISOString().slice(0, 16) : "",
    dateLabel: row?.date_label ?? "",
    description: row?.description ?? "",
    detailsReady: Boolean(row?.details_ready),
    details: row?.details ?? "",
    flyerUrl: row?.flyer_url ?? "",
    showVideoUrl: row?.main_video_url ?? "",
    showVideoPosterUrl: row?.main_video_poster_url ?? "",
    galleryUrls: Array.isArray(row?.gallery_urls) ? row!.gallery_urls!.map((u) => String(u)).filter(Boolean) : [],
    recapYoutubeUrl: row?.recap_youtube_url ?? "",
    pixiesetUrl: row?.pixieset_url ?? "",
    collectionSlugsCsv: (row?.collection_slugs ?? []).join(", "),
    sortOrder: Number(row?.sort_order ?? 0),
  };
}

export default function EventsContentPage() {
  const [heading, setHeading] = useState("Events");
  const [subheading, setSubheading] = useState("");
  const [body, setBody] = useState("");
  const [topVideoUrl, setTopVideoUrl] = useState("");
  const [topVideoPosterUrl, setTopVideoPosterUrl] = useState("");
  const [pageId, setPageId] = useState<number>(1);
  const [hasRow, setHasRow] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsSaving, setEventsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"main" | "upcoming" | "update">("main");
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<DraftEvent>(() => toDraft(null));
  const [nowTick, setNowTick] = useState(0);
  const [updateKind, setUpdateKind] = useState<null | "video" | "youtube" | "pixieset" | "collections">(null);
  const [updateStep, setUpdateStep] = useState<0 | 1>(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("events_page")
        .select("id, heading, subheading, body, top_video_url, top_video_poster_url, updated_at")
        .maybeSingle();

      if (error) throw error;

      const row = (data as EventsPageRow | null) ?? null;
      setHasRow(Boolean(row));
      setPageId(Number(row?.id ?? 1));
      setHeading((row?.heading ?? "Events").trim?.() ? String(row?.heading).trim() : "Events");
      setSubheading(row?.subheading ? String(row.subheading) : "");
      setBody(row?.body ? String(row.body) : "");
      setTopVideoUrl(row?.top_video_url ? String(row.top_video_url) : "");
      setTopVideoPosterUrl(row?.top_video_poster_url ? String(row.top_video_poster_url) : "");
    } catch (err) {
      console.error(err);
      toast.error("Could not load events content (check Supabase table/policies).");
      setHasRow(false);
      setPageId(1);
      setHeading("Events");
      setSubheading("");
      setBody("");
      setTopVideoUrl("");
      setTopVideoPosterUrl("");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const { data, error } = await supabase
        .from("events")
        .select(
          "id, slug, title, category, status, location, start_at, date_label, description, details, details_ready, main_video_url, main_video_poster_url, flyer_url, gallery_urls, recap_youtube_url, pixieset_url, collection_slugs, sort_order, updated_at",
        )
        .order("status", { ascending: true })
        .order("sort_order", { ascending: true })
        .order("start_at", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      setEvents((data as EventRow[]) ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Could not load events list (check Supabase table/policies).");
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    void loadEvents();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNowTick((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        id: 1,
        heading: heading.trim() || "Events",
        subheading: subheading.trim() || null,
        body: body.trim() || null,
        top_video_url: topVideoUrl.trim() || null,
        top_video_poster_url: topVideoPosterUrl.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (hasRow) {
        const { error } = await supabase.from("events_page").update(payload).eq("id", pageId || 1);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("events_page").insert(payload);
        if (error) throw error;
        setHasRow(true);
      }

      toast.success("Events page saved.");
      await load();
    } catch (err) {
      console.error(err);
      toast.error("Could not save events content (check Supabase table/policies).");
    } finally {
      setIsSaving(false);
    }
  };

  const openNew = (status: EventStatus) => {
    setDraft({
      ...toDraft(null),
      status,
      category: "fashion_shows",
      slug: "",
      title: "",
    });
    setUpdateKind(null);
    setUpdateStep(0);
    setEditorOpen(true);
  };

  const openEdit = (row: EventRow) => {
    setDraft(toDraft(row));
    setUpdateKind(null);
    setUpdateStep(0);
    setEditorOpen(true);
  };

  const saveEvent = async () => {
    const slug = sanitizeSlug(draft.slug);
    if (!slug) {
      toast.error("Add a slug (e.g. blah-blah-2025).");
      return;
    }
    if (!draft.title.trim()) {
      toast.error("Add a title.");
      return;
    }

    setEventsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        slug,
        title: draft.title.trim(),
        category: draft.category,
        status: draft.status,
        location: draft.location.trim() || null,
        start_at: draft.startAt ? new Date(draft.startAt).toISOString() : null,
        date_label: draft.dateLabel.trim() || null,
        description: draft.description.trim() || null,
        details_ready: draft.detailsReady,
        details: draft.detailsReady ? (draft.details.trim() || null) : (draft.details.trim() || null),
        flyer_url: draft.flyerUrl.trim() || null,
        main_video_url: draft.showVideoUrl.trim() || null,
        main_video_poster_url: draft.showVideoPosterUrl.trim() || null,
        gallery_urls: (draft.galleryUrls ?? []).map((u) => String(u || "").trim()).filter(Boolean),
        recap_youtube_url: draft.recapYoutubeUrl.trim() || null,
        pixieset_url: draft.pixiesetUrl.trim() || null,
        collection_slugs: parseCollectionSlugs(draft.collectionSlugsCsv),
        sort_order: Number(draft.sortOrder ?? 0),
        updated_at: new Date().toISOString(),
      };

      if (draft.id) {
        const { error } = await supabase.from("events").update(payload).eq("id", draft.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("events").insert(payload);
        if (error) throw error;
      }

      toast.success("Event saved.");
      setEditorOpen(false);
      await loadEvents();
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || "Could not save event.";
      toast.error(msg);
    } finally {
      setEventsSaving(false);
    }
  };

  const deleteEvent = async (row: EventRow) => {
    if (!window.confirm(`Delete "${row.title}"? This cannot be undone.`)) return;
    setEventsSaving(true);
    try {
      const { error } = await supabase.from("events").delete().eq("id", row.id);
      if (error) throw error;
      toast.success("Event deleted.");
      await loadEvents();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Could not delete event.");
    } finally {
      setEventsSaving(false);
    }
  };

  const effectiveStatus = useCallback((e: EventRow): "upcoming" | "past" => {
    if (e.start_at) {
      const t = new Date(e.start_at).getTime();
      if (!Number.isNaN(t) && t <= Date.now()) return "past";
    }
    return e.status === "past" ? "past" : "upcoming";
  }, []);

  const isDraftPast = useMemo(() => {
    if (draft.startAt) {
      const t = new Date(draft.startAt).getTime();
      if (!Number.isNaN(t) && t <= Date.now()) return true;
    }
    return draft.status === "past";
  }, [draft.startAt, draft.status]);

  const upcomingRows = useMemo(
    () => events.filter((e) => effectiveStatus(e) === "upcoming"),
    [effectiveStatus, events, nowTick],
  );
  const pastRows = useMemo(
    () => events.filter((e) => effectiveStatus(e) === "past"),
    [effectiveStatus, events, nowTick],
  );

  return (
    <div className="w-full max-w-none space-y-8">
      <div>
        <nav className="mb-2 text-sm text-zinc-800">
          <Link href="/content" className="hover:text-zinc-900">
            Site Content
          </Link>
          <span className="mx-2 text-zinc-300">/</span>
          <Link href="/content/app-pages" className="hover:text-zinc-900">
            App pages
          </Link>
          <span className="mx-2 text-zinc-300">/</span>
          <span className="font-medium text-zinc-900">Events</span>
        </nav>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Events page</h1>
        <p className="mt-1 text-sm text-zinc-900">
          This content powers the public <code className="px-1.5 py-0.5 rounded bg-zinc-100">/events</code> page.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "main" as const, label: "Main page" },
            { id: "upcoming" as const, label: "Upcoming event" },
            { id: "update" as const, label: "Event update" },
          ] as const
        ).map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === "main" ? (
        isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-sm text-zinc-900">Loading…</div>
          </div>
        ) : (
          <form onSubmit={save} className="space-y-8">
            <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
              <div className="border-b border-zinc-200 px-6 py-5 bg-white">
                <h3 className="text-base font-semibold leading-6 text-zinc-900">Main page video</h3>
                <p className="mt-1 text-sm text-zinc-900">
                  Upload/paste the MP4 URL for the full-bleed video at the top of <code>/events</code>. Add a poster
                  image so it shows while the video loads.
                </p>
              </div>
              <div className="p-6 space-y-3">
                <AssetUrlField
                  label="Top video URL"
                  value={topVideoUrl}
                  onChange={setTopVideoUrl}
                  uploadFolder="events/top"
                  accept="video/*"
                  placeholder="Upload MP4 or paste URL"
                />
                <AssetUrlField
                  label="Poster image (while video loads)"
                  value={topVideoPosterUrl}
                  onChange={setTopVideoPosterUrl}
                  uploadFolder="events/top/poster"
                  accept="image/*"
                  placeholder="Upload image or paste URL"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-md bg-zinc-950 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        )
      ) : null}

      {/* Upcoming events */}
      {activeTab === "upcoming" ? (
      <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
        <div className="border-b border-zinc-200 px-6 py-5 bg-white flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold leading-6 text-zinc-900">Upcoming events</h3>
            <p className="mt-1 text-sm text-zinc-900">
              Create upcoming event cards. If time/date/write-up is empty, users will see the newsletter popup.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openNew("upcoming")}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              + Add upcoming
            </button>
          </div>
        </div>

        <div className="p-6">
          {eventsLoading ? (
            <div className="text-sm text-zinc-900">Loading events…</div>
          ) : upcomingRows.length === 0 ? (
            <div className="text-sm text-zinc-900">No events in this tab yet.</div>
          ) : (
            <div className="space-y-3">
              {upcomingRows.map((e) => (
                <div
                  key={e.id}
                  className="rounded-lg border border-zinc-200 bg-white p-4 flex flex-wrap items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-zinc-900">
                      {e.title}{" "}
                      <span className="text-zinc-700 font-normal">({e.slug})</span>
                    </div>
                    <div className="mt-1 text-xs text-zinc-800">
                      {String(e.category)} · {String(e.status)} · sort {Number(e.sort_order ?? 0)}
                      {e.date_label ? ` · ${e.date_label}` : ""}
                    </div>
                    {e.details_ready ? (
                      <div className="mt-2 inline-flex rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800">
                        Details ready (popup shows details)
                      </div>
                    ) : (
                      <div className="mt-2 inline-flex rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                        Details not ready (popup shows newsletter)
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(e)}
                      className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
                      disabled={eventsSaving}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteEvent(e)}
                      className="rounded-md border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                      disabled={eventsSaving}
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
      ) : null}

      {/* Event update (past events) */}
      {activeTab === "update" ? (
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="border-b border-zinc-200 px-6 py-5 bg-white flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold leading-6 text-zinc-900">Event update</h3>
              <p className="mt-1 text-sm text-zinc-900">
                Update videos, galleries, Pixieset/YouTube links, and collections after the event.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openNew("past")}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              + Add past event
            </button>
          </div>

          <div className="p-6">
            {eventsLoading ? (
              <div className="text-sm text-zinc-900">Loading events…</div>
            ) : pastRows.length === 0 ? (
              <div className="text-sm text-zinc-900">No past events yet.</div>
            ) : (
              <div className="space-y-3">
                {pastRows.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-lg border border-zinc-200 bg-white p-4 flex flex-wrap items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-zinc-900">
                        {e.title}{" "}
                        <span className="text-zinc-700 font-normal">({e.slug})</span>
                      </div>
                      <div className="mt-1 text-xs text-zinc-800">
                        {String(e.category)} · past · sort {Number(e.sort_order ?? 0)}
                        {e.date_label ? ` · ${e.date_label}` : ""}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(e)}
                        className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
                        disabled={eventsSaving}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteEvent(e)}
                        className="rounded-md border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                        disabled={eventsSaving}
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
      ) : null}

      {/* Event editor modal */}
      {editorOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 bg-black/55 backdrop-blur-sm"
            aria-hidden
            onClick={() => !eventsSaving && setEditorOpen(false)}
          />
          <div
            className="relative w-full max-w-3xl max-h-[calc(100vh-2rem)] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex max-h-[calc(100vh-2rem)] flex-col">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 px-6 py-5">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-900">
                    {draft.id ? "Edit event" : "New event"}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-800">
                    Upcoming: Details popup uses <strong>Details ready</strong> + Details text.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-md border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
                  onClick={() => setEditorOpen(false)}
                  disabled={eventsSaving}
                >
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                {isDraftPast ? (
                  <div className="space-y-5">
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                      <div className="text-sm font-semibold text-zinc-900">
                        How would you like to update <span className="font-bold">{draft.title || "this event"}</span>?
                      </div>
                      <div className="mt-1 text-xs text-zinc-600">
                        {draft.slug ? (
                          <>
                            Event: <code className="rounded bg-white px-1.5 py-0.5 border border-zinc-200">{sanitizeSlug(draft.slug)}</code>
                          </>
                        ) : (
                          <>Choose what to update. Basic info is already saved.</>
                        )}
                      </div>
                    </div>

                    {updateStep === 0 ? (
                      <>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {(
                            [
                              {
                                id: "video" as const,
                                title: "Video",
                                desc: "Upload MP4 so the card gets “Watch show”.",
                              },
                              {
                                id: "youtube" as const,
                                title: "YouTube recap",
                                desc: "Paste link so the card gets “Watch recap”.",
                              },
                              {
                                id: "pixieset" as const,
                                title: "Pixieset gallery",
                                desc: "Paste link so the card gets “View gallery”.",
                              },
                              {
                                id: "collections" as const,
                                title: "Collections",
                                desc: "Add collection slugs so the card gets “View collection”.",
                              },
                            ] as const
                          ).map((c) => {
                            const active = updateKind === c.id;
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => setUpdateKind(c.id)}
                                className={`text-left rounded-xl border p-4 transition-colors ${
                                  active
                                    ? "border-zinc-900 bg-white"
                                    : "border-zinc-200 bg-white hover:bg-zinc-50"
                                }`}
                              >
                                <div className="text-sm font-semibold text-zinc-900">{c.title}</div>
                                <div className="mt-1 text-xs text-zinc-600">{c.desc}</div>
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={!updateKind}
                            onClick={() => setUpdateStep(1)}
                            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid gap-4 sm:grid-cols-2">
                          {updateKind === "video" ? (
                            <>
                              <div className="sm:col-span-2">
                                <AssetUrlField
                                  label="Main show video (Watch show)"
                                  value={draft.showVideoUrl}
                                  onChange={(url) => setDraft((p) => ({ ...p, showVideoUrl: url }))}
                                  uploadFolder={`events/${sanitizeSlug(draft.slug || "draft")}/video`}
                                  accept="video/*"
                                  placeholder="Upload MP4 or paste URL"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <AssetUrlField
                                  label="Poster image (while video loads)"
                                  value={draft.showVideoPosterUrl}
                                  onChange={(url) => setDraft((p) => ({ ...p, showVideoPosterUrl: url }))}
                                  uploadFolder={`events/${sanitizeSlug(draft.slug || "draft")}/video-poster`}
                                  accept="image/*"
                                  placeholder="Upload image or paste URL"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-zinc-700">Long description</label>
                                <textarea
                                  value={draft.details}
                                  onChange={(e) => setDraft((p) => ({ ...p, details: e.target.value }))}
                                  rows={6}
                                  className="mt-1 w-full rounded-md border border-zinc-300 p-2 text-sm"
                                  placeholder="Optional: update the long description / popup details."
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <AssetGalleryField
                                  label="Event gallery"
                                  value={draft.galleryUrls}
                                  onChange={(urls) => setDraft((p) => ({ ...p, galleryUrls: urls }))}
                                  uploadFolder={`events/${sanitizeSlug(draft.slug || "draft")}/gallery`}
                                  accept="image/*"
                                />
                              </div>
                            </>
                          ) : null}

                          {updateKind === "youtube" ? (
                            <div className="sm:col-span-2">
                              <label className="block text-sm font-medium text-zinc-700">YouTube recap URL</label>
                              <input
                                value={draft.recapYoutubeUrl}
                                onChange={(e) => setDraft((p) => ({ ...p, recapYoutubeUrl: e.target.value }))}
                                placeholder="https://www.youtube.com/watch?v=…"
                                className="mt-1 w-full rounded-md border border-zinc-300 p-2 text-sm"
                              />
                            </div>
                          ) : null}

                          {updateKind === "pixieset" ? (
                            <div className="sm:col-span-2">
                              <label className="block text-sm font-medium text-zinc-700">Pixieset gallery URL</label>
                              <input
                                value={draft.pixiesetUrl}
                                onChange={(e) => setDraft((p) => ({ ...p, pixiesetUrl: e.target.value }))}
                                placeholder="https://…pixieset.com/…"
                                className="mt-1 w-full rounded-md border border-zinc-300 p-2 text-sm"
                              />
                            </div>
                          ) : null}

                          {updateKind === "collections" ? (
                            <div className="sm:col-span-2">
                              <label className="block text-sm font-medium text-zinc-700">
                                Collection slugs (comma-separated)
                              </label>
                              <input
                                value={draft.collectionSlugsCsv}
                                onChange={(e) => setDraft((p) => ({ ...p, collectionSlugsCsv: e.target.value }))}
                                placeholder="always-lit, limited-edition"
                                className="mt-1 w-full rounded-md border border-zinc-300 p-2 text-sm"
                              />
                              <p className="mt-1 text-xs text-zinc-700">
                                These should match <code>/collection/[slug]</code>.
                              </p>
                            </div>
                          ) : null}

                          <div>
                            <label className="block text-sm font-medium text-zinc-700">Sort order</label>
                            <input
                              type="number"
                              value={draft.sortOrder}
                              onChange={(e) => setDraft((p) => ({ ...p, sortOrder: Number(e.target.value) }))}
                              className="mt-1 w-full rounded-md border border-zinc-300 p-2 text-sm"
                            />
                          </div>
                        </div>

                        <div className="flex justify-between gap-2">
                          <button
                            type="button"
                            className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                            onClick={() => setUpdateStep(0)}
                          >
                            Back
                          </button>
                          <button
                            type="button"
                            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                            onClick={() => void saveEvent()}
                            disabled={eventsSaving}
                          >
                            {eventsSaving ? "Saving…" : "Save update"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-zinc-700">Title</label>
                <input
                  value={draft.title}
                  onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-zinc-300 p-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Slug</label>
                <input
                  value={draft.slug}
                  onChange={(e) => setDraft((p) => ({ ...p, slug: e.target.value }))}
                  placeholder="blah-blah-2025"
                  className="mt-1 w-full rounded-md border border-zinc-300 p-2 text-sm"
                />
                <p className="mt-1 text-xs text-zinc-700">
                  Used for <code>/events/[slug]</code>. Lowercase with dashes.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700">Category</label>
                <select
                  value={draft.category}
                  onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value as EventCategory }))}
                  className="mt-1 w-full rounded-md border border-zinc-300 p-2 text-sm"
                >
                  <option value="fashion_shows">Fashion shows</option>
                  <option value="clan_festival">Clan festival</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700">Date label</label>
                <input
                  value={draft.dateLabel}
                  onChange={(e) => setDraft((p) => ({ ...p, dateLabel: e.target.value }))}
                  placeholder="2025 / June 2026"
                  className="mt-1 w-full rounded-md border border-zinc-300 p-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700">Start date/time (optional)</label>
                <input
                  type="datetime-local"
                  value={draft.startAt}
                  onChange={(e) => setDraft((p) => ({ ...p, startAt: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-zinc-300 p-2 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-zinc-700">Location (optional)</label>
                <input
                  value={draft.location}
                  onChange={(e) => setDraft((p) => ({ ...p, location: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-zinc-300 p-2 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-zinc-700">Short description</label>
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-zinc-300 p-2 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="flex items-center gap-3 text-sm font-medium text-zinc-700">
                  <input
                    type="checkbox"
                    checked={draft.detailsReady}
                    onChange={(e) => setDraft((p) => ({ ...p, detailsReady: e.target.checked }))}
                  />
                  Details ready (Details popup shows details instead of newsletter)
                </label>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-zinc-700">Details (popup content)</label>
                <textarea
                  value={draft.details}
                  onChange={(e) => setDraft((p) => ({ ...p, details: e.target.value }))}
                  rows={5}
                  className="mt-1 w-full rounded-md border border-zinc-300 p-2 text-sm"
                  placeholder="Add the confirmed time/date, address, RSVP instructions, etc."
                />
              </div>

              <div className="sm:col-span-2">
                <AssetUrlField
                  label="Flyer image (card background)"
                  value={draft.flyerUrl}
                  onChange={(url) => setDraft((p) => ({ ...p, flyerUrl: url }))}
                  uploadFolder={`events/${sanitizeSlug(draft.slug || "draft")}/flyer`}
                  accept="image/*"
                  placeholder="Upload image or paste URL"
                />
              </div>

              {isDraftPast ? (
                <>
                  <div className="sm:col-span-2">
                    <AssetUrlField
                      label="Main show video (Watch show)"
                      value={draft.showVideoUrl}
                      onChange={(url) => setDraft((p) => ({ ...p, showVideoUrl: url }))}
                      uploadFolder={`events/${sanitizeSlug(draft.slug || "draft")}/video`}
                      accept="video/*"
                      placeholder="Upload MP4 or paste URL"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <AssetUrlField
                      label="Poster image (while video loads)"
                      value={draft.showVideoPosterUrl}
                      onChange={(url) => setDraft((p) => ({ ...p, showVideoPosterUrl: url }))}
                      uploadFolder={`events/${sanitizeSlug(draft.slug || "draft")}/video-poster`}
                      accept="image/*"
                      placeholder="Upload image or paste URL"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-zinc-700">YouTube recap URL (optional)</label>
                    <input
                      value={draft.recapYoutubeUrl}
                      onChange={(e) => setDraft((p) => ({ ...p, recapYoutubeUrl: e.target.value }))}
                      placeholder="https://www.youtube.com/watch?v=…"
                      className="mt-1 w-full rounded-md border border-zinc-300 p-2 text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-zinc-700">Pixieset gallery URL (optional)</label>
                    <input
                      value={draft.pixiesetUrl}
                      onChange={(e) => setDraft((p) => ({ ...p, pixiesetUrl: e.target.value }))}
                      placeholder="https://…pixieset.com/…"
                      className="mt-1 w-full rounded-md border border-zinc-300 p-2 text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-zinc-700">Collection slugs (comma-separated)</label>
                    <input
                      value={draft.collectionSlugsCsv}
                      onChange={(e) => setDraft((p) => ({ ...p, collectionSlugsCsv: e.target.value }))}
                      placeholder="always-lit, limited-edition"
                      className="mt-1 w-full rounded-md border border-zinc-300 p-2 text-sm"
                    />
                    <p className="mt-1 text-xs text-zinc-700">These should match <code>/collection/[slug]</code>.</p>
                  </div>
                </>
              ) : null}

              <div>
                <label className="block text-sm font-medium text-zinc-700">Sort order</label>
                <input
                  type="number"
                  value={draft.sortOrder}
                  onChange={(e) => setDraft((p) => ({ ...p, sortOrder: Number(e.target.value) }))}
                  className="mt-1 w-full rounded-md border border-zinc-300 p-2 text-sm"
                />
              </div>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-zinc-200 bg-white px-6 py-4">
                <button
                  type="button"
                  className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  onClick={() => setEditorOpen(false)}
                  disabled={eventsSaving}
                >
                  Cancel
                </button>
                {!isDraftPast ? (
                  <button
                    type="button"
                    className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                    onClick={() => void saveEvent()}
                    disabled={eventsSaving}
                  >
                    {eventsSaving ? "Saving…" : "Save event"}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

