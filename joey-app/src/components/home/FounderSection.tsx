"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { dataStore, SHOP_COLLECTIONS_FALLBACK } from "@/lib/dataStore";
import type { PublicCollection, SiteContent } from "@/lib/types";
import styles from "./FounderSection.module.css";

function CtaLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const h = href.trim() || "/story";
  if (h.startsWith("http://") || h.startsWith("https://")) {
    return (
      <a href={h} className={className} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link href={h} className={className}>
      {children}
    </Link>
  );
}

export default function FounderSection({
  initialCollections,
  initialSiteContent,
  hideContent = false,
}: {
  initialCollections?: PublicCollection[];
  initialSiteContent: SiteContent;
  hideContent?: boolean;
}) {
  const isFallback = (cols?: PublicCollection[] | null) =>
    !!cols?.length && cols.every((c) => typeof c.id === "string" && c.id.startsWith("fallback-"));

  const collections = useSyncExternalStore(
    dataStore.subscribe,
    dataStore.getCollections,
    () => (initialCollections && initialCollections.length > 0 ? initialCollections : SHOP_COLLECTIONS_FALLBACK),
  );

  const site = useSyncExternalStore(
    dataStore.subscribe,
    dataStore.getSiteContent,
    () => initialSiteContent,
  );

  const collectionCount =
    collections?.length && !isFallback(collections)
      ? collections.length
      : initialCollections && initialCollections.length > 0
        ? initialCollections.length
        : SHOP_COLLECTIONS_FALLBACK.length;

  const videoUrl = site.founderVideoUrl?.trim() ?? "";
  const posterRaw = site.founderVideoPosterUrl?.trim() ?? "";
  /** Poster image URL for <img>; never use the video URL as image src (MP4 mistaken as poster). */
  const usablePoster =
    videoUrl && posterRaw && posterRaw !== videoUrl ? posterRaw : "";
  /** Still background when only a poster is set — previously the section rendered no media without a video URL. */
  const posterOnly = Boolean(posterRaw && !videoUrl);
  const [videoLoading, setVideoLoading] = useState(Boolean(videoUrl));
  const revealOnce = useRef(false);

  const revealVideo = useCallback(() => {
    if (revealOnce.current) return;
    revealOnce.current = true;
    setVideoLoading(false);
  }, []);

  useEffect(() => {
    revealOnce.current = false;
    queueMicrotask(() => {
      setVideoLoading(Boolean(videoUrl));
    });
  }, [videoUrl]);

  const kicker = site.founderKicker?.trim() || initialSiteContent.founderKicker;
  const headline = site.founderHeadline?.trim() || initialSiteContent.founderHeadline;
  const ctaLabel = site.founderCtaLabel?.trim() || initialSiteContent.founderCtaLabel;
  const ctaHref = site.founderCtaHref?.trim() || initialSiteContent.founderCtaHref;

  return (
    <section
      className={`${styles.founder} ${hideContent ? styles.founderVideoOnly : ""}`}
      id={hideContent ? undefined : "founder"}
      aria-label="Behind the pattern"
      aria-busy={videoUrl && videoLoading ? true : undefined}
    >
      <div className={styles.media} aria-hidden="true">
        {posterOnly ? (
          <>
            <img
              key={posterRaw}
              src={posterRaw}
              alt=""
              className={styles.bgImg}
              draggable={false}
            />
            <div className={styles.scrim} aria-hidden="true" />
          </>
        ) : videoUrl ? (
          <>
            {usablePoster ? (
              <img
                key={usablePoster}
                src={usablePoster}
                alt=""
                className={`${styles.bgImg} ${styles.poster}`}
                draggable={false}
              />
            ) : null}
            <video
              key={videoUrl}
              className={`${styles.bgImg} ${styles.video} ${videoLoading ? "" : styles.videoVisible}`}
              src={videoUrl}
              poster={usablePoster || undefined}
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
            />
            <div className={styles.scrim} aria-hidden="true" />
            <div
              className={`${styles.videoLoader} ${!videoLoading ? styles.videoLoaderDone : ""} ${
                usablePoster ? styles.videoLoaderOverPoster : ""
              }`}
            >
              <div className={styles.videoLoaderSpinner} />
            </div>
          </>
        ) : null}
      </div>

      {!hideContent && (
        <div className={styles.shell}>
          <div className={styles.copy}>
            <span className={styles.kicker}>{kicker}</span>
            <h2 className={styles.headline}>{headline}</h2>
            <CtaLink href={ctaHref} className={styles.cta}>
              {ctaLabel}
            </CtaLink>
          </div>

          <div className="container">
            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statNum}>{collectionCount}</span>
                <span className={styles.statLabel}>Collections</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <span className={styles.statNum}>100+</span>
                <span className={styles.statLabel}>Bespoke Clients</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <span className={styles.statNum}>GH</span>
                <span className={styles.statLabel}>Accra, Ghana</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
