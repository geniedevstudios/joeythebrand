"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "../events.module.css";
import { usableVideoPoster } from "@/lib/eventVideoPoster";

type Props = {
  src?: string;
  /** e.g. events page: admin poster URL; event detail: often `flyerUrl` */
  posterUrl?: string;
};

export default function EventVideo({ src, posterUrl }: Props) {
  const revealOnce = useRef(false);
  const [loading, setLoading] = useState(Boolean(src));
  const usablePoster = usableVideoPoster(src, posterUrl);

  useEffect(() => {
    revealOnce.current = false;
    setLoading(Boolean(src));
  }, [src, posterUrl]);

  const reveal = useCallback(() => {
    if (revealOnce.current) return;
    revealOnce.current = true;
    setLoading(false);
  }, []);

  if (!src) {
    return <div style={{ aspectRatio: "16 / 9", background: "#000" }} />;
  }

  return (
    <>
      <div className={styles.videoFrame} aria-hidden="true" />
      {usablePoster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={usablePoster}
          alt=""
          className={styles.videoPoster}
          draggable={false}
        />
      ) : null}
      <video
        key={src}
        className={`${styles.video} ${loading ? "" : styles.videoReady}`}
        poster={usablePoster || undefined}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onPlaying={reveal}
        onCanPlay={(e) => {
          const v = e.currentTarget;
          if (v.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA && !v.paused) reveal();
        }}
        onTimeUpdate={(e) => {
          if (e.currentTarget.currentTime > 0.02) reveal();
        }}
        onError={reveal}
      >
        <source src={src} type="video/mp4" />
      </video>
      <div
        className={`${styles.videoLoader} ${loading ? "" : styles.videoLoaderDone} ${usablePoster ? styles.videoLoaderOverPoster : ""}`}
        aria-hidden={!loading}
      >
        <div className={styles.videoLoaderSpinner} />
        <span className={styles.videoLoaderSrOnly}>{loading ? "Loading event video" : ""}</span>
      </div>
    </>
  );
}
