"use client";

import { useMemo, useRef, useSyncExternalStore } from "react";
import type { NewsSpotlightItem, SiteContent } from "@/lib/types";
import { dataStore } from "@/lib/dataStore";
import NewsHero from "./NewsHero";
import styles from "./news.module.css";

const EMPTY_SPOTLIGHTS: NewsSpotlightItem[] = [];

export default function NewsClient({
  initialSiteContent,
  items,
}: {
  initialSiteContent: SiteContent;
  items: NewsSpotlightItem[];
}) {
  const serverItemsRef = useRef(items);
  serverItemsRef.current = items;

  const serverSnap = useMemo(() => [...items], [items]);

  const newsItems = useSyncExternalStore(
    dataStore.subscribe,
    () => dataStore.getSiteContent().newsSpotlights ?? EMPTY_SPOTLIGHTS,
    () => serverSnap,
  );

  /** After Realtime/init applies site_content, use store; until then keep SSR list (no flash). */
  const displayItems = dataStore.hasAppliedSiteContentFromRemote()
    ? newsItems
    : serverItemsRef.current;

  return (
    <div className={styles.page}>
      <NewsHero initialSiteContent={initialSiteContent}>
        <div className="container">
          <span className="section-label" style={{ color: "var(--cinereous)" }}>
            Latest
          </span>
          <h1 className={`t-display ${styles.title}`}>News &amp; Blog</h1>
          <p className={styles.lead}>
            Clips, conversations, and editorials — tap through to the full video or episode.
          </p>
        </div>
      </NewsHero>

      <section className={styles.list} aria-label="News and media">
        <div className="container">
          {displayItems.length === 0 ? (
            <p className={styles.empty}>New stories are on the way. Check back soon.</p>
          ) : (
            displayItems.map((item) => <SpotlightCard key={item.id} item={item} />)
          )}
        </div>
      </section>
    </div>
  );
}

function SpotlightCard({ item }: { item: NewsSpotlightItem }) {
  const href = item.destinationUrl.trim();
  const label = item.buttonLabel?.trim() || "Watch full video";

  return (
    <article className={styles.card}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.mediaLink}
        aria-label={`Open teaser: ${label}`}
      >
        <div className={styles.media}>
          {item.snapshotKind === "video" && item.snapshotUrl.trim() ? (
            <video
              className={styles.mediaVideo}
              src={item.snapshotUrl.trim()}
              muted
              loop
              playsInline
              autoPlay
              preload="metadata"
              aria-hidden
            />
          ) : item.snapshotUrl.trim() ? (
            // eslint-disable-next-line @next/next/no-img-element -- dynamic CMS URLs
            <img className={styles.mediaImg} src={item.snapshotUrl.trim()} alt="" />
          ) : null}
        </div>
      </a>
      <div className={styles.body}>
        {item.description.trim() ? <p className={styles.description}>{item.description.trim()}</p> : null}
        <a href={href} target="_blank" rel="noopener noreferrer" className={styles.cta}>
          {label}
        </a>
      </div>
    </article>
  );
}
