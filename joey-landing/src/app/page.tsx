"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import styles from "./page.module.css";
import ClockFace from "@/components/ClockFace";
import CuratedPill from "@/components/CuratedPill";

const INSTAGRAM_URL = process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://www.instagram.com/joey_thebrand/#";
const FACEBOOK_URL  = process.env.NEXT_PUBLIC_FACEBOOK_URL  || "#";
const TWITTER_URL   = process.env.NEXT_PUBLIC_TWITTER_URL   || "#";

type Status = "idle" | "success" | "error";

export default function LandingPage() {
  const [email, setEmail]     = useState("");
  const [checked, setChecked] = useState(false);
  const [status, setStatus]   = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, start]    = useTransition();
  const section2Ref           = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 } // lowered slightly to trigger sooner
    );
    if (section2Ref.current) observer.observe(section2Ref.current);
    return () => observer.disconnect();
  }, []);

  const isValid = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && checked,
    [email, checked],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    start(async () => {
      try {
        const res  = await fetch("/api/subscribe", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ email: trimmed }),
        });
        const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
        if (!res.ok || !data?.ok) {
          setStatus("error");
          setMessage(data?.message ?? "Could not subscribe. Please try again.");
          return;
        }
        setStatus("success");
        setMessage("You're on the list. Watch your inbox.");
        setEmail("");
        setChecked(false);
      } catch {
        setStatus("error");
        setMessage("Network error. Please try again.");
      }
    });
  }

  function scrollToSubscribe() {
    section2Ref.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className={styles.page}>

      {/* ── Background ── */}
      <div className={styles.heroBg} aria-hidden="true" />

      {/* ── Navbar ── */}
      <nav className={styles.nav} aria-label="Site navigation">
        <div className={styles.logo} aria-label="JOEY">JOEY</div>
        {/* Nav items removed per request */}
      </nav>

      {/* ── Hero (section 1 — full-bleed bg + clock) ── */}
      <main className={styles.main}>
        <div className={styles.heroBgWrapper}>
          <video
            autoPlay
            loop
            muted
            playsInline
            className={styles.heroVideo}
            src="/hero-video.mp4"
            poster="/hero-bg.jpg"
            aria-hidden="true"
          />
          <div className={styles.heroVignette}></div>
        </div>
        <div className={styles.hero}>
          <ClockFace />
          <div className={styles.textBlock}>
            <p className={styles.eyebrow}>Our new site is</p>
            <h1 className={styles.headline}>Coming<br />Soon</h1>
            <p className={styles.sub}>Stay Tuned!</p>
          </div>
        </div>
      </main>

      {/* ── Section 2 — pure black, intro + subscribe ── */}
      <section ref={section2Ref} className={styles.section2} aria-label="Subscribe section">
        <div className={styles.section2Inner}>

          {/* Intro blurb */}
          <div className={`${styles.introParagraph} ${styles.reveal} ${isVisible ? styles.revealActive : ""} ${styles.delay1}`}>
            <span style={{ textTransform: "uppercase", letterSpacing: "0.15em", color: "#fff", fontWeight: 700 }}>About The Brand</span><br /><br />
            More than fashion —<br />
            identity stitched into form.<br /><br />
            Founded on the belief that clothing should command presence before a word is spoken, JOEY THE BRAND merges architectural tailoring with cultural depth. Each piece is crafted to embody strength, elegance, and intentional design.<br /><br />
            Rooted in bold structure and refined minimalism, JOEY THE BRAND exists for individuals who understand that style is not decoration — it is declaration.<br /><br />
            <em>&quot;Style is not decoration — it is declaration.&quot;</em><br />
            Power worn well.
          </div>

          {/* Subscribe heading */}
          <h2 className={`${styles.subscribeHeading} ${styles.reveal} ${isVisible ? styles.revealActive : ""} ${styles.delay2}`}>
            Subscribe to be the first to know about our launch
          </h2>

          {/* Form */}
          <form onSubmit={onSubmit} className={`${styles.subscribeBlock} ${styles.reveal} ${isVisible ? styles.revealActive : ""} ${styles.delay3}`} aria-label="Newsletter subscribe">
            <div className={styles.fieldGroup}>
              <label htmlFor="s2-email" className={styles.fieldLabel}>Email *</label>
              <input
                id="s2-email"
                className={styles.fieldInput}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder=""
                value={email}
                onChange={ev => setEmail(ev.target.value)}
                required
              />
            </div>

            <div className={styles.checkRow}>
              <label className={styles.checkLabel}>
                <input
                  className={styles.checkbox}
                  type="checkbox"
                  checked={checked}
                  onChange={ev => setChecked(ev.target.checked)}
                  required
                />
                <span className={styles.checkText}>Yes, subscribe me to your newsletter. *</span>
              </label>
              <button
                className={styles.submitBtn}
                type="submit"
                disabled={!isValid || isPending}
              >
                {isPending ? "…" : "Subscribe"}
              </button>
            </div>

            {message && (
              <p
                className={`${styles.statusMsg} ${status === "success" ? styles.statusMsgSuccess : ""}`}
                role="status"
              >
                {message}
              </p>
            )}
          </form>

          {/* Follow Us block below form */}
          <div className={`${styles.followUsBlock} ${styles.reveal} ${isVisible ? styles.revealActive : ""} ${styles.delay3}`}>
            <p className={styles.followUsText}>Follow Us</p>
            <div className={styles.socialLinks} style={{ justifyContent: 'center' }}>
              <span className={styles.socialLink} style={{ cursor: "default", opacity: 0.5 }} aria-label="X (Inactive)">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.258 5.639 5.907-5.638zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </span>
              <a className={styles.socialLink} href={INSTAGRAM_URL} target="_blank" rel="noreferrer" aria-label="Instagram">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <span className={styles.socialLink} style={{ cursor: "default", opacity: 0.5 }} aria-label="Facebook (Inactive)">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer} aria-label="Site footer">
        <p className={styles.footerCopy}>© {new Date().getFullYear()} JOEY THE BRAND. All rights reserved.</p>
        <CuratedPill devHref={null} />
      </footer>

    </div>
  );
}
