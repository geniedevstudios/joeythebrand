import type { CSSProperties } from "react";
import Link from "next/link";
import styles from "../events.module.css";
import { fetchPublicEventBySlug } from "@/lib/fetchEventsServer";
import { PAGE_HERO_SHELL_CLASS } from "@/hooks/usePageHero";
import EventVideo from "./EventVideo";

export const dynamic = "force-dynamic";

function formatWhen(startAt?: string, dateLabel?: string): string | null {
  const label = (dateLabel ?? "").trim();
  if (startAt) {
    const d = new Date(startAt);
    if (!Number.isNaN(d.getTime())) {
      return `${d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })} · ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
    }
  }
  return label || null;
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await fetchPublicEventBySlug(slug);

  if (event === undefined) {
    // This indicates a connection error/timeout after multiple retries.
    // Instead of throwing a 500 error, we show a friendly "Connection Issue" UI.
    return (
      <div className={styles.page}>
        <div
          className="container flex flex-col items-center justify-center text-center"
          style={{ minHeight: "80vh", padding: "var(--space-xl)" }}
        >
          <span className={styles.kicker}>Connectivity</span>
          <h1 className={styles.title} style={{ marginBottom: "var(--space-md)" }}>
            Connection issue
          </h1>
          <p className={styles.subtitle} style={{ marginBottom: "var(--space-xl)", maxWidth: "420px", marginLeft: "auto", marginRight: "auto" }}>
            We're having trouble showing you the event's update right now. This usually happens when your internet is slow.
          </p>
          <Link
            href={`/events/${slug}`}
            className={`${styles.actionBtn} ${styles.actionPrimary}`}
            style={{ minWidth: "180px" }}
          >
            Try again
          </Link>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <main className={styles.page}>
        <section className={styles.headingSection}>
          <div className="container">
            <span className={styles.kicker}>Events</span>
            <h1 className={styles.title}>Event not found</h1>
            <p className={styles.subtitle}>This event doesn’t exist yet. Go back to the events page.</p>
            <div style={{ marginTop: "var(--space-lg)" }}>
              <Link className={`${styles.actionBtn} ${styles.actionPrimary}`} href="/events">
                Back to events
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const when = formatWhen(event.startAt, event.dateLabel);
  const longText = (event.details ?? "").trim();
  const gallery = (event.galleryUrls ?? []).filter((u) => String(u || "").trim());
  const flyer = (event.flyerUrl ?? "").trim();
  const headingFlyerStyle: (CSSProperties & { "--detail-flyer"?: string }) | undefined =
    flyer.length > 0
      ? { "--detail-flyer": `url("${flyer.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}")` }
      : undefined;

  return (
    <div className={styles.page}>
      <section className={`${PAGE_HERO_SHELL_CLASS} ${styles.videoSection}`} aria-label="Event video">
        <EventVideo src={event.mainVideoUrl} posterUrl={event.mainVideoPosterUrl ?? event.flyerUrl} />
      </section>

      <section
        className={flyer ? `${styles.headingSection} ${styles.headingSectionWithFlyer}` : styles.headingSection}
        style={headingFlyerStyle}
      >
        <div className="container">
          <span className={`${styles.kicker} ${flyer ? styles.kickerOnFlyer : ""}`}>Events</span>
          <h1 className={`${styles.title} ${flyer ? styles.titleOnFlyer : ""}`}>{event.title}</h1>
          <p className={`${styles.subtitle} ${flyer ? styles.subtitleOnFlyer : ""}`}>{event.description ?? ""}</p>
        </div>
      </section>

      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Event update</h2>
          </div>

          <article className={styles.card}>
            <div className={styles.cardTop}>
              <div className={styles.cardMeta}>
                <span className={styles.badge}>{event.category === "fashion_shows" ? "Fashion show" : "Clan festival"}</span>
                {when ? <span className={styles.meta}>{when}</span> : null}
              </div>
              {event.location ? <p className={styles.cardLocation}>{event.location}</p> : null}
            </div>

            {longText ? <p className={styles.cardDesc}>{longText}</p> : null}

            <div className={styles.actions}>
              {event.recapYoutubeUrl ? (
                <a className={`${styles.actionBtn} ${styles.actionSecondary}`} href={event.recapYoutubeUrl} target="_blank" rel="noopener noreferrer">
                  Watch recap
                </a>
              ) : null}
              {event.pixiesetUrl ? (
                <a className={`${styles.actionBtn} ${styles.actionSecondary}`} href={event.pixiesetUrl} target="_blank" rel="noopener noreferrer">
                  View gallery
                </a>
              ) : null}
              {event.collectionSlugs?.[0] ? (
                <Link className={`${styles.actionBtn} ${styles.actionSecondary}`} href={`/collection/${event.collectionSlugs[0]}`}>
                  View collection
                </Link>
              ) : null}
              <Link className={`${styles.actionBtn} ${styles.actionPrimary}`} href="/events">
                Back to events
              </Link>
            </div>
          </article>

          {gallery.length ? (
            <div className={styles.shotsSection}>
              <h3 className={styles.shotsTitle}>Pieces from the event</h3>
              <div className={styles.shotsGrid} aria-label="Pieces from the event">
                {gallery.map((u, idx) => (
                  <div key={`${u}-${idx}`} className={styles.shotCard}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className={styles.shotImg} src={u} alt="" loading="lazy" />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

