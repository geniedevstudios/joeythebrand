"use client";

import { useMemo, useRef, useSyncExternalStore } from "react";
import type { NewsSpotlightItem, SiteContent } from "@/lib/types";
import { dataStore } from "@/lib/dataStore";
import { useStoreLoading } from "@/hooks/useStoreLoading";
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

  const isStoreLoading = useStoreLoading();

  /** After Realtime/init applies site_content, use store; until then keep SSR list (no flash). */
  const displayItems = dataStore.hasAppliedSiteContentFromRemote()
    ? newsItems
    : serverItemsRef.current;

  const showSkeleton = isStoreLoading && displayItems.length === 0;

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
          {showSkeleton ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={styles.skeletonItem}>
                <div className={`${styles.skeletonMedia} skeleton`} />
                <div className={styles.body}>
                  <div className={`${styles.skeletonText} skeleton`} style={{ height: 28, width: "80%" }} />
                  <div className={`${styles.skeletonText} skeleton`} style={{ height: 16, width: "100%" }} />
                  <div className={`${styles.skeletonText} skeleton`} style={{ height: 16, width: "90%" }} />
                  <div className={`${styles.skeletonText} skeleton`} style={{ height: 40, width: 140, marginTop: 12 }} />
                </div>
              </div>
            ))
          ) : displayItems.length === 0 ? (
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
        {(item.title || "").trim() ? (
          <h2 className={styles.itemTitle}>{item.title!.trim()}</h2>
        ) : null}
        {item.description.trim() ? <p className={styles.description}>{item.description.trim()}</p> : null}
        <a href={href} target="_blank" rel="noopener noreferrer" className={`btn btn-outline ${styles.cta}`}>
          {label}
        </a>
      </div>
    </article>
  );
}
