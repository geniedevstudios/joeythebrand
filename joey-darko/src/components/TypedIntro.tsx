"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./TypedIntro.module.css";

const FULL_TEXT =
  "Hi there, I'm Joey. I help fashion brands and individuals elevate their style, build their brand identity, and achieve their creative vision. From consultation to full production, I guide you every step of the way.";

const MS_PER_CHAR = 28;

export default function TypedIntro() {
  const rootRef = useRef<HTMLDivElement>(null);
  const hasTriggered = useRef(false);
  const [active, setActive] = useState(false);
  const [visible, setVisible] = useState("");

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasTriggered.current) return;
        hasTriggered.current = true;
        setActive(true);
        io.disconnect();
      },
      { root: null, threshold: 0.22, rootMargin: "0px 0px -8% 0px" },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;

    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setVisible(FULL_TEXT.slice(0, i));
      if (i >= FULL_TEXT.length) {
        window.clearInterval(id);
      }
    }, MS_PER_CHAR);

    return () => window.clearInterval(id);
  }, [active]);

  return (
    <div ref={rootRef} className={styles.root}>
      <p className={styles.srOnly}>{FULL_TEXT}</p>
      <p className={styles.typeLine} aria-hidden="true">
        {visible}
        <span className={styles.cursor} aria-hidden />
      </p>
    </div>
  );
}
