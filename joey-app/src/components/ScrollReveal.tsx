"use client";
import { useEffect, useRef } from "react";

interface Props {
  children: React.ReactNode;
  className?: string;
}

/**
 * Mark revealed if the block overlaps the viewport, or if it sits fully above
 * the viewport (user has already scrolled past — common after scroll restoration
 * on refresh). Otherwise IntersectionObserver handles below-fold content.
 */
function tryReveal(el: HTMLElement): boolean {
  if (el.classList.contains("visible")) return true;
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const overlapsViewport = rect.top < vh && rect.bottom > 0;
  const fullyAboveViewport = rect.height > 0 && rect.bottom <= 0;
  if (overlapsViewport || fullyAboveViewport) {
    el.classList.add("visible");
    return true;
  }
  return false;
}

export default function ScrollReveal({ children, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.classList.add("animate-ready");

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.05, rootMargin: "60px 0px 0px 0px" },
    );

    const attachObserverIfNeeded = () => {
      if (el.classList.contains("visible")) return;
      observer.observe(el);
    };

    const run = () => tryReveal(el);

    requestAnimationFrame(() => {
      if (run()) {
        observer.disconnect();
        return;
      }
      requestAnimationFrame(() => {
        if (run()) {
          observer.disconnect();
          return;
        }
        attachObserverIfNeeded();
      });
    });

    const onLoad = () => {
      if (tryReveal(el)) observer.disconnect();
    };
    window.addEventListener("load", onLoad);

    return () => {
      window.removeEventListener("load", onLoad);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  );
}
