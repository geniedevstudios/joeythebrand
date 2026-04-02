"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import styles from "./HeroSection.module.css";

const words = ["Power.", "Precision.", "Presence."];

export default function HeroSection() {
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);

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
    <section className={styles.hero} id="hero">
      {/* Background image */}
      <div className={styles.bg} aria-hidden="true">
        <img src="/hero.png" alt="JOEY THE BRAND editorial" className={styles.bgImg} />
        <div className={styles.overlay} />
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
