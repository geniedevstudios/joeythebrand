"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./HeroSection.module.css";
import type { SiteContent } from "@/lib/types";
import { useHomeHeroMediaWithSSRSeed, useHomeHeroPosterWithSSRSeed } from "@/hooks/usePageHero";
import { resolveHeroLayout } from "@/lib/pageHeroes";

const words = ["Power.", "Precision.", "Presence."];

export default function HeroSection({ initialSiteContent }: { initialSiteContent: SiteContent }) {
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const heroVideoRevealOnce = useRef(false);
  const media = useHomeHeroMediaWithSSRSeed(initialSiteContent);
  const posterUrl = useHomeHeroPosterWithSSRSeed(initialSiteContent);
  const { fit, position } = resolveHeroLayout(media);
  const posterTrimmed = posterUrl?.trim() ?? "";
  /** Poster image URL (not the video file); avoids using MP4 as <img src>. */
  const usablePoster =
    media.kind === "video" && posterTrimmed && posterTrimmed !== media.src.trim()
      ? posterTrimmed
      : "";
  const [heroVideoLoading, setHeroVideoLoading] = useState(media.kind === "video");

  const revealHeroVideo = useCallback(() => {
    if (heroVideoRevealOnce.current) return;
    heroVideoRevealOnce.current = true;
    setHeroVideoLoading(false);
  }, []);

  useEffect(() => {
    if (media.kind === "video") {
      heroVideoRevealOnce.current = false;
      setHeroVideoLoading(true);
    } else {
      heroVideoRevealOnce.current = false;
      setHeroVideoLoading(false);
    }
  }, [media.kind, media.src]);

  useEffect(() => {
    wordRefs.current.forEach((el, i) => {
      if (!el) return;
      setTimeout(() => {
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      }, 200 + i * 180);
    });
  }, []);

  return (
    <section
      className={styles.hero}
      id="hero"
      aria-busy={media.kind === "video" && heroVideoLoading ? true : undefined}
    >
      <div className={styles.bg} aria-hidden="true">
        {media.kind === "video" ? (
          <>
            {usablePoster ? (
              <img
                src={usablePoster}
                alt=""
                className={`${styles.bgImg} ${styles.heroPoster}`}
                style={{
                  objectFit: fit === "contain" ? "contain" : "cover",
                  objectPosition: position,
                }}
                draggable={false}
              />
            ) : null}
            <video
              key={media.src}
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
              <source src={media.src} />
            </video>
          </>
        ) : (
          <img
            src={media.src}
            alt="JOEY THE BRAND editorial"
            className={styles.bgImg}
            style={{
              objectFit: fit === "contain" ? "contain" : "cover",
              objectPosition: position,
            }}
          />
        )}
        <div className={styles.overlay} />
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
      </div>

      {/* Content */}
      <div className={`container ${styles.content}`}>
        <span className={styles.preLabel}>EST. ACCRA, GHANA</span>

        <h1 className={styles.headline}>
          {words.map((word, i) => (
            <span
              key={word}
              ref={(el) => { wordRefs.current[i] = el; }}
              className={styles.word}
              style={{ transitionDelay: `${i * 0.18}s` }}
            >
              {word}
            </span>
          ))}
        </h1>

        <p className={styles.subtext}>
          JOEY THE BRAND is a contemporary fashion house redefining modern
          silhouettes through structure, symbolism, and unapologetic identity.
        </p>

        <div className={styles.ctas}>
          <Link href="/shop" className="btn btn-primary btn-lg" id="hero-shop-cta">
            Shop The Collection
          </Link>
          <Link href="/story" className="btn btn-ghost btn-lg" id="hero-story-cta">
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
