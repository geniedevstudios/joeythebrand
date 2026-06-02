"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import styles from "./SplashLoader.module.css";

/**
 * Full-screen splash that plays `/JOEY END.mp4` while the page loads.
 * Waits for BOTH conditions before fading out:
 *   1. The video finishes playing (or fails / times out after 8 s).
 *   2. The window `load` event has fired (all sub-resources ready).
 *
 * While visible, body scroll is locked.
 */
export default function SplashLoader() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoEnded, setVideoEnded] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  /* ── Page-ready listener ────────────────────────── */
  useEffect(() => {
    if (document.readyState === "complete") {
      setPageReady(true);
    } else {
      const onLoad = () => setPageReady(true);
      window.addEventListener("load", onLoad);
      return () => window.removeEventListener("load", onLoad);
    }
  }, []);

  /* ── Safety timeout — never block the user longer than 8 s ── */
  useEffect(() => {
    const id = setTimeout(() => {
      setVideoEnded(true);
      setPageReady(true);
    }, 8000);
    return () => clearTimeout(id);
  }, []);

  /* ── Lock scroll while splash is active ─────────── */
  useEffect(() => {
    if (!dismissed) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [dismissed]);

  /* ── Dismiss once both conditions are met ────────── */
  useEffect(() => {
    if (videoEnded && pageReady) {
      // small grace period so the fade feels smooth
      const id = setTimeout(() => setDismissed(true), 350);
      return () => clearTimeout(id);
    }
  }, [videoEnded, pageReady]);

  /* ── Video event handlers ───────────────────────── */
  const handleEnded = useCallback(() => setVideoEnded(true), []);
  const handleError = useCallback(() => setVideoEnded(true), []);

  if (dismissed) return null;

  const shouldFade = videoEnded && pageReady;

  return (
    <div
      className={`${styles.overlay} ${shouldFade ? styles.fadeOut : ""}`}
      aria-hidden="true"
    >
      <video
        ref={videoRef}
        className={styles.video}
        src="/JOEY%20END.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={handleEnded}
        onError={handleError}
      />
    </div>
  );
}
