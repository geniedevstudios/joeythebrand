"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import styles from "./events.module.css";
import DetailsModal from "./DetailsModal";
import type { PublicEvent } from "@/lib/fetchEventsServer";
import { supabase } from "@/lib/supabase";
import { usableVideoPoster } from "@/lib/eventVideoPoster";

type EventCategory = "all" | "fashion_shows" | "clan_festival";
type PastAction =
  | { kind: "watch"; label: string; href: string }
  | { kind: "gallery"; label: string; href: string }
  | { kind: "collection"; label: string; href: string }
  | { kind: "recap"; label: string; href: string };

type EventDbRow = Record<string, unknown>;

type EventCard = {
  id: string;
  title: string;
  year?: string;
  category: Exclude<EventCategory, "all">;
  location?: string;
  dateLabel?: string;
  description?: string;
  image?: string;
  actions: PastAction[];
};

const FILTERS: { id: EventCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "fashion_shows", label: "Fashion shows" },
  { id: "clan_festival", label: "Clan festival" },
];

function ActionButton({ a }: { a: PastAction }) {
  const cls = a.kind === "watch" ? styles.actionPrimary : styles.actionSecondary;
  if (a.kind === "gallery" || a.kind === "recap") {
    return (
      <a className={`${styles.actionBtn} ${cls}`} href={a.href} target="_blank" rel="noopener noreferrer">
        {a.label}
      </a>
    );
  }
  return (
    <Link className={`${styles.actionBtn} ${cls}`} href={a.href}>
      {a.label}
    </Link>
  );
}

function isDetailsAction(a: PastAction): boolean {
  return a.kind === "watch" && a.label.toLowerCase() === "details";
}

function EventGrid({
  items,
  onOpenDetails,
}: {
  items: EventCard[];
  onOpenDetails?: (id: string) => void;
}) {

  return (
    <>
      <div className={styles.grid}>
        {items.map((e) => (
          <article
            key={e.id}
            className={styles.card}
            style={
              e.image
                ? ({ "--card-bg": `url("${e.image}")` } as CSSProperties)
                : undefined
            }
          >
            <div className={styles.cardTop}>
              <div className={styles.cardMeta}>
                <span className={styles.badge}>
                  {e.category === "fashion_shows" ? "Fashion show" : "Clan festival"}
                </span>
                {e.dateLabel ? <span className={styles.meta}>{e.dateLabel}</span> : null}
              </div>
              <h3 className={styles.cardTitle}>
                {e.title} {e.year ? <span className={styles.cardYear}>{e.year}</span> : null}
              </h3>
              {e.location ? <p className={styles.cardLocation}>{e.location}</p> : null}
            </div>

            {e.description ? <p className={styles.cardDesc}>{e.description}</p> : null}

            <div className={styles.actions}>
              {e.actions.map((a, idx) => {
                if (isDetailsAction(a)) {
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`${styles.actionBtn} ${styles.actionPrimary}`}
                      onClick={() => onOpenDetails?.(e.id)}
                    >
                      {a.label}
                    </button>
                  );
                }
                return <ActionButton key={idx} a={a} />;
              })}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

export default function EventsClient({
  topVideoUrl,
  topVideoPosterUrl,
  heading,
  subheading,
  events,
}: {
  topVideoUrl?: string;
  topVideoPosterUrl?: string;
  heading?: string;
  subheading?: string;
  events: PublicEvent[];
}) {
  const [liveEvents, setLiveEvents] = useState<PublicEvent[]>(events);
  const [liveTopVideoUrl, setLiveTopVideoUrl] = useState<string | undefined>(topVideoUrl);
  const [liveTopVideoPosterUrl, setLiveTopVideoPosterUrl] = useState<string | undefined>(topVideoPosterUrl);
  const [liveHeading, setLiveHeading] = useState<string | undefined>(heading);
  const [liveSubheading, setLiveSubheading] = useState<string | undefined>(subheading);
  const [filter, setFilter] = useState<EventCategory>("all");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsEvent, setDetailsEvent] = useState<PublicEvent | null>(null);
  const videoRevealOnce = useRef(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const [nowTick, setNowTick] = useState(0);
  /** True until the first client-side DB refresh completes — drives skeleton UI. */
  const [isFetching, setIsFetching] = useState(events.length === 0);


  const revealVideo = useCallback(() => {
    if (videoRevealOnce.current) return;
    videoRevealOnce.current = true;
    setVideoLoading(false);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNowTick((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const effectiveStatus = useCallback((e: PublicEvent): "upcoming" | "past" => {
    if (e.startAt) {
      const t = new Date(e.startAt).getTime();
      if (!Number.isNaN(t) && t <= Date.now()) return "past";
    }
    return e.status === "past" ? "past" : "upcoming";
  }, []);

  useEffect(() => {
    setLiveEvents(events);
  }, [events]);

  useEffect(() => {
    setLiveTopVideoUrl(topVideoUrl);
  }, [topVideoUrl]);

  useEffect(() => {
    setLiveTopVideoPosterUrl(topVideoPosterUrl);
  }, [topVideoPosterUrl]);

  const topUsablePoster = useMemo(
    () => usableVideoPoster(liveTopVideoUrl, liveTopVideoPosterUrl),
    [liveTopVideoUrl, liveTopVideoPosterUrl],
  );

  useEffect(() => {
    videoRevealOnce.current = false;
    setVideoLoading(true);
  }, [liveTopVideoUrl, topUsablePoster]);

  useEffect(() => {
    setLiveHeading(heading);
  }, [heading]);

  useEffect(() => {
    setLiveSubheading(subheading);
  }, [subheading]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let t: ReturnType<typeof setTimeout> | undefined;

    const refresh = () => {
      if (t) clearTimeout(t);
      t = setTimeout(async () => {
        t = undefined;
        const { data, error } = await supabase
          .from("events")
          .select(
            "id, slug, title, category, status, location, start_at, date_label, description, details_ready, details, main_video_url, main_video_poster_url, flyer_url, gallery_urls, recap_youtube_url, pixieset_url, collection_slugs, sort_order",
          )
          .order("status", { ascending: true })
          .order("sort_order", { ascending: true })
          .order("start_at", { ascending: true })
          .order("created_at", { ascending: false });

        if (error || !data) return;
        const rows = data as EventDbRow[];
        const next = rows.map((row) => ({
          id: String(row.id),
          slug: String(row.slug),
          title: String(row.title),
          category: row.category === "clan_festival" ? "clan_festival" : "fashion_shows",
          status: row.status === "past" ? "past" : "upcoming",
          location: row.location ? String(row.location) : undefined,
          startAt: row.start_at ? String(row.start_at) : undefined,
          dateLabel: row.date_label ? String(row.date_label) : undefined,
          description: row.description ? String(row.description) : undefined,
          flyerUrl: row.flyer_url ? String(row.flyer_url) : undefined,
          mainVideoUrl: row.main_video_url ? String(row.main_video_url) : undefined,
          mainVideoPosterUrl: row.main_video_poster_url ? String(row.main_video_poster_url) : undefined,
          galleryUrls: Array.isArray(row.gallery_urls)
            ? row.gallery_urls.map((x) => String(x)).filter(Boolean)
            : [],
          recapYoutubeUrl: row.recap_youtube_url ? String(row.recap_youtube_url) : undefined,
          pixiesetUrl: row.pixieset_url ? String(row.pixieset_url) : undefined,
          collectionSlugs: Array.isArray(row.collection_slugs)
            ? row.collection_slugs.map((s) => String(s)).filter(Boolean)
            : [],
          detailsReady: Boolean(row.details_ready),
          details: row.details ? String(row.details) : undefined,
          sortOrder: Number(row.sort_order ?? 0),
        })) as PublicEvent[];

        setLiveEvents(next);
        setIsFetching(false);

      }, 150);
    };

    // Initial fetch to avoid stale SSR data.
    refresh();

    const channel = supabase
      .channel("events-public-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, refresh)
      .subscribe();

    return () => {
      if (t) clearTimeout(t);
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let t: ReturnType<typeof setTimeout> | undefined;

    const refreshPage = () => {
      if (t) clearTimeout(t);
      t = setTimeout(async () => {
        t = undefined;
        const { data, error } = await supabase
          .from("events_page")
          .select("heading, subheading, top_video_url, top_video_poster_url")
          .maybeSingle();
        if (error || !data) return;

        const d = data as Record<string, unknown>;
        const nextHeading = typeof d.heading === "string" ? d.heading.trim() : undefined;
        const nextSubheading = typeof d.subheading === "string" ? d.subheading.trim() : undefined;
        const nextTop = typeof d.top_video_url === "string" ? d.top_video_url.trim() : undefined;
        const nextPoster =
          typeof d.top_video_poster_url === "string" ? d.top_video_poster_url.trim() : undefined;

        setLiveHeading(nextHeading || "Events");
        setLiveSubheading(nextSubheading || undefined);
        setLiveTopVideoUrl(nextTop || undefined);
        setLiveTopVideoPosterUrl(nextPoster || undefined);

        // Force loader when the source changes.
        videoRevealOnce.current = false;
        setVideoLoading(true);
      }, 150);
    };

    // Initial fetch (in case SSR content is stale).
    refreshPage();

    const channel = supabase
      .channel("events-page-public-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "events_page" }, refreshPage)
      .subscribe();

    return () => {
      if (t) clearTimeout(t);
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!detailsOpen || !detailsEvent?.id) return;
    const next = liveEvents.find((e) => e.id === detailsEvent.id) ?? null;
    if (next) setDetailsEvent(next);
  }, [detailsEvent?.id, detailsOpen, liveEvents]);

  const upcomingCards: EventCard[] = useMemo(() => {
    void nowTick;
    const list = liveEvents
      .filter((e) => effectiveStatus(e) === "upcoming")
      .map((e) => ({
        id: e.id,
        title: e.title,
        year: e.dateLabel,
        category: e.category,
        location: e.location,
        dateLabel: e.dateLabel,
        description: e.description,
        image: e.flyerUrl,
        actions: [{ kind: "watch" as const, label: "Details", href: "#" }],
      }));
    if (filter === "all") return list;
    return list.filter((e) => e.category === filter);
  }, [effectiveStatus, filter, liveEvents, nowTick]);

  const pastCards: EventCard[] = useMemo(() => {
    void nowTick;
    const list = liveEvents
      .filter((e) => effectiveStatus(e) === "past")
      .map((e) => {
        const actions: PastAction[] = [];
        if (e.mainVideoUrl) actions.push({ kind: "watch", label: "Watch show", href: `/events/${e.slug}` });
        if (e.recapYoutubeUrl) actions.push({ kind: "recap", label: "Watch recap", href: e.recapYoutubeUrl });
        if (e.pixiesetUrl) actions.push({ kind: "gallery", label: "View gallery", href: e.pixiesetUrl });
        if (e.collectionSlugs?.[0]) actions.push({ kind: "collection", label: "View collection", href: `/collection/${e.collectionSlugs[0]}` });
        return {
          id: e.id,
          title: e.title,
          year: e.dateLabel,
          category: e.category,
          location: e.location,
          dateLabel: e.dateLabel,
          description: e.description,
          image: e.flyerUrl,
          actions,
        };
      });
    if (filter === "all") return list;
    return list.filter((e) => e.category === filter);
  }, [effectiveStatus, filter, liveEvents, nowTick]);

  const openDetails = (cardId?: string) => {
    const ev = liveEvents.find((e) => e.id === cardId) ?? null;
    setDetailsEvent(ev);
    setDetailsOpen(true);
  };

  return (
    <main className={styles.page}>
      {/* Top video section */}
      <section
        className={styles.videoSection}
        aria-label="Events video"
        aria-busy={videoLoading ? true : undefined}
      >
        <div className={styles.videoFrame} aria-hidden="true" />
        {topUsablePoster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={topUsablePoster}
            alt=""
            className={styles.videoPoster}
            draggable={false}
          />
        ) : null}
        <video
          key={`${liveTopVideoUrl || ""}|${topUsablePoster || ""}`}
          className={`${styles.video} ${videoLoading ? "" : styles.videoReady}`}
          poster={topUsablePoster || undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onPlaying={revealVideo}
          onCanPlay={(e) => {
            const v = e.currentTarget;
            if (v.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA && !v.paused) revealVideo();
          }}
          onTimeUpdate={(e) => {
            if (e.currentTarget.currentTime > 0.02) revealVideo();
          }}
          onError={revealVideo}
        >
          <source src={liveTopVideoUrl || "/hero.mp4"} type="video/mp4" />
        </video>
        <div
          className={`${styles.videoLoader} ${videoLoading ? "" : styles.videoLoaderDone} ${topUsablePoster ? styles.videoLoaderOverPoster : ""}`}
          aria-hidden={!videoLoading}
        >
          <div className={styles.videoLoaderSpinner} />
          <span className={styles.videoLoaderSrOnly}>{videoLoading ? "Loading events video" : ""}</span>
        </div>
      </section>

      {/* Title + filters */}
      <section className={styles.headingSection}>
        <div className="container">
          <div className={styles.headingRow}>
            <div>
              <span className={styles.kicker}>Events</span>
              <h1 className={styles.title}>{liveHeading ?? "Events"}</h1>
              <p className={styles.subtitle}>
                {liveSubheading ?? "Announcements, trunk shows, and private moments — all in one place."}
              </p>
            </div>

            <div className={styles.filters} role="tablist" aria-label="Event category filter">
              {FILTERS.map((f) => {
                const active = filter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    className={`${styles.filterBtn} ${active ? styles.filterBtnActive : ""}`}
                    onClick={() => setFilter(f.id)}
                    aria-pressed={active}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Upcoming events</h2>
            <p className={styles.sectionSub}>What&apos;s next — save the date.</p>
          </div>
          {isFetching ? (
            <div className={styles.grid}>
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className={styles.card}
                  style={{ padding: 32, display: "flex", flexDirection: "column", gap: 16, minHeight: 220 }}
                >
                  <div className="skeleton" style={{ height: 22, width: "30%" }} />
                  <div className="skeleton" style={{ height: 28, width: "65%" }} />
                  <div className="skeleton" style={{ height: 14, width: "45%" }} />
                  <div className="skeleton" style={{ height: 14, width: "80%" }} />
                  <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
                    <div className="skeleton" style={{ height: 38, width: 110, borderRadius: 9999 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : upcomingCards.length ? (
            <EventGrid items={upcomingCards} onOpenDetails={(id) => openDetails(id)} />
          ) : (
            <p className={styles.empty}>No upcoming events right now.</p>
          )}
        </div>
      </section>

      {/* Past */}
      <section className={styles.sectionAlt}>
        <div className="container">
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Past events</h2>
            <p className={styles.sectionSub}>Revisit the moments — shows, galleries, and collections.</p>
          </div>
          {isFetching ? (
            <div className={styles.grid}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={styles.card}
                  style={{ padding: 32, display: "flex", flexDirection: "column", gap: 16, minHeight: 260 }}
                >
                  <div className="skeleton" style={{ height: 22, width: "40%" }} />
                  <div className="skeleton" style={{ height: 28, width: "70%" }} />
                  <div className="skeleton" style={{ height: 14, width: "50%" }} />
                  <div className="skeleton" style={{ height: 14, width: "85%", marginTop: 8 }} />
                  <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
                    <div className="skeleton" style={{ height: 38, width: 120, borderRadius: 9999 }} />
                    <div className="skeleton" style={{ height: 38, width: 110, borderRadius: 9999 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : pastCards.length ? (
            <EventGrid items={pastCards} />
          ) : (
            <p className={styles.empty}>No past events yet.</p>
          )}
        </div>
      </section>

      <DetailsModal open={detailsOpen} onClose={() => setDetailsOpen(false)} event={detailsEvent} />
    </main>
  );
}

