"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./HeroSection.module.css";
import type { SiteContent } from "@/lib/types";
import {
  useHomeHeroMediaWithSSRSeed,
  useHomeHeroPosterWithSSRSeed,
  usePageHeroShellSpinnerWithSSRSeed,
  useResponsiveSrc,
} from "@/hooks/usePageHero";
import { resolveHeroLayout } from "@/lib/pageHeroes";



export default function HeroSection({ initialSiteContent }: { initialSiteContent: SiteContent }) {
  const heroVideoRevealOnce = useRef(false);
  const media = useHomeHeroMediaWithSSRSeed(initialSiteContent);
  const activeSrc = useResponsiveSrc(media);
  const posterUrl = useHomeHeroPosterWithSSRSeed(initialSiteContent);
  const { fit, position } = resolveHeroLayout(media);
  const homeHeroSpinner = usePageHeroShellSpinnerWithSSRSeed("home", initialSiteContent);
  const posterTrimmed = posterUrl?.trim() ?? "";
  /** Poster image URL (not the video file); avoids using MP4 as <img src>. */
  const usablePoster =
    media.kind === "video" && posterTrimmed && posterTrimmed !== media.src.trim()
      ? posterTrimmed
      : "";
  const [heroVideoLoading, setHeroVideoLoading] = useState(media.kind === "video");
  /** Staggered CSS reveal for headline / subtext / CTAs (see .heroReady in CSS). */
  const [heroCopyReady, setHeroCopyReady] = useState(false);

  const revealHeroVideo = useCallback(() => {
    if (heroVideoRevealOnce.current) return;
    heroVideoRevealOnce.current = true;
    setHeroVideoLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      if (media.kind === "video") {
        heroVideoRevealOnce.current = false;
        setHeroVideoLoading(true);
      } else {
        heroVideoRevealOnce.current = false;
        setHeroVideoLoading(false);
      }
    });
  }, [media.kind, media.src]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      requestAnimationFrame(() => setHeroCopyReady(true));
      return;
    }
    const id = requestAnimationFrame(() => setHeroCopyReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section
      className={`${styles.hero} ${heroCopyReady ? styles.heroReady : ""}`}
      id="hero"
      aria-busy={media.kind === "video" && heroVideoLoading ? true : undefined}
    >
      <div className={styles.bg} aria-hidden="true">
        {media.kind === "video" ? (
          <>
            {usablePoster ? (
              <picture>
                {media.mobilePosterUrl ? <source media="(max-width: 640px)" srcSet={media.mobilePosterUrl} /> : null}
                <img
                  key={usablePoster}
                  src={usablePoster}
                  alt=""
                  className={`${styles.bgImg} ${styles.heroPoster}`}
                  style={{
                    objectFit: fit === "contain" ? "contain" : "cover",
                    objectPosition: position,
                  }}
                  draggable={false}
                />
              </picture>
            ) : null}
            <video
              key={activeSrc}
              className={`${styles.bgImg} ${styles.heroBgVideo} ${heroVideoLoading ? "" : styles.heroBgVideoVisible}`}
              style={{
                objectFit: fit === "contain" ? "contain" : "cover",
                objectPosition: position,
              }}
              poster={usablePoster || undefined}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              onPlaying={revealHeroVideo}
              onCanPlay={(e) => {
                const v = e.currentTarget;
                if (v.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA && !v.paused) revealHeroVideo();
              }}
              onTimeUpdate={(e) => {
                if (e.currentTarget.currentTime > 0.02) revealHeroVideo();
              }}
              onError={revealHeroVideo}
            >
              {media.mobileSrc ? <source media="(max-width: 640px)" src={media.mobileSrc} /> : null}
              {media.tabletSrc ? <source media="(max-width: 1024px)" src={media.tabletSrc} /> : null}
              <source src={media.src} />
            </video>
          </>
        ) : media.src.trim() ? (
          /* Admin has set an image — render it */
          <picture>
            {media.mobileSrc ? <source media="(max-width: 640px)" srcSet={media.mobileSrc} /> : null}
            {media.tabletSrc ? <source media="(max-width: 1024px)" srcSet={media.tabletSrc} /> : null}
            <img
              key={media.src}
              src={media.src}
              alt="JOEY THE BRAND editorial"
              className={styles.bgImg}
              style={{
                objectFit: fit === "contain" ? "contain" : "cover",
                objectPosition: position,
              }}
            />
          </picture>
        ) : null /* No hero set — black bg from .bg, spinner below */}
        <div className={styles.overlay} />
        {/* Spinner while video loads */}
        {media.kind === "video" && (
          <div
            className={`${styles.videoLoader} ${heroVideoLoading ? "" : styles.videoLoaderDone} ${usablePoster ? styles.videoLoaderOverPoster : ""}`}
            aria-hidden={!heroVideoLoading}
          >
            <div className={styles.videoLoaderSpinner} />
            <span className={styles.videoLoaderSrOnly}>
              {heroVideoLoading ? "Loading hero video" : ""}
            </span>
          </div>
        )}
        {/* Spinner only while site content init runs; then black bg only if admin left hero empty */}
        {media.kind === "image" && !media.src.trim() && homeHeroSpinner ? (
          <div className={styles.heroEmptySpinner} aria-hidden="true" />
        ) : null}
      </div>

      {/* Content */}
      <div className={`container ${styles.content}`}>
        <div className={styles.ctas}>
          <Link href="/shop" className={styles.glassBtn} id="hero-shop-cta">
            Shop The Collection
          </Link>
          <Link href="/story" className={styles.glassBtn} id="hero-story-cta">
            Discover The Story
          </Link>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className={styles.scrollIndicator} aria-hidden="true">
        <span className={styles.scrollLine} />
        <span className={styles.scrollText}>Scroll</span>
      </div>
    </section>
  );
}
