"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { dataStore } from "@/lib/dataStore";
import type { PromotionPopupConfig } from "@/lib/types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./PromotionPopup.module.css";

function storeSubscribe(cb: () => void) {
  return dataStore.subscribe(cb);
}

type PopupStoreState = { appliedFromRemote: boolean; popups: PromotionPopupConfig[] };

function popupConfigEqual(a: PromotionPopupConfig, b: PromotionPopupConfig): boolean {
  return (
    a.enabled === b.enabled &&
    a.mediaKind === b.mediaKind &&
    a.mediaUrl === b.mediaUrl &&
    a.posterUrl === b.posterUrl &&
    a.headline === b.headline &&
    a.body === b.body &&
    a.buttonLabel === b.buttonLabel &&
    a.action === b.action &&
    a.productSlugOrId === b.productSlugOrId
  );
}

function popupConfigArrayEqual(a: PromotionPopupConfig[], b: PromotionPopupConfig[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id || !popupConfigEqual(a[i], b[i])) return false;
  }
  return true;
}

type Props = {
  initialPromotionPopups: PromotionPopupConfig[];
};

export default function PromotionPopup({ initialPromotionPopups }: Props) {
  const router = useRouter();

  const serverSnapshot = useMemo(
    (): PopupStoreState => ({ appliedFromRemote: false, popups: initialPromotionPopups }),
    [initialPromotionPopups],
  );

  const getServerSnapshot = useCallback(() => serverSnapshot, [serverSnapshot]);

  const clientSnapshotCache = useRef<PopupStoreState | null>(null);

  const getSnapshot = useCallback((): PopupStoreState => {
    const appliedFromRemote = dataStore.hasAppliedSiteContentFromRemote();
    const popups = appliedFromRemote ? dataStore.getSiteContent().promotionPopups : initialPromotionPopups;

    const prev = clientSnapshotCache.current;
    if (
      prev &&
      prev.appliedFromRemote === appliedFromRemote &&
      (prev.popups === popups || popupConfigArrayEqual(prev.popups, popups))
    ) {
      return prev;
    }

    const next: PopupStoreState = { appliedFromRemote, popups };
    clientSnapshotCache.current = next;
    return next;
  }, [initialPromotionPopups]);

  const { popups } = useSyncExternalStore(storeSubscribe, getSnapshot, getServerSnapshot);
  const [dismissed, setDismissed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const eligiblePopups = useMemo(() => {
    return popups.filter((p) => p.enabled && p.mediaUrl.trim().length > 0 && p.headline.trim().length > 0);
  }, [popups]);

  const visible = !dismissed && eligiblePopups.length > 0;

  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDismissed(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  useEffect(() => {
    if (!visible || eligiblePopups.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % eligiblePopups.length);
    }, 8000); // cycle every 8 seconds
    return () => clearInterval(interval);
  }, [visible, eligiblePopups.length]);

  const dismiss = useCallback(() => setDismissed(true), []);

  if (!visible) return null;

  const activePopup = eligiblePopups[currentIndex];

  const onCta = () => {
    dismiss();
    const slug = activePopup.productSlugOrId.trim();
    if (activePopup.action === "newsletter") {
      window.requestAnimationFrame(() => {
        document.getElementById("footer-newsletter")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }
    if (activePopup.action === "news") {
      router.push("/news");
      return;
    }
    if (activePopup.action === "product") {
      if (!slug) return;
      router.push(`/shop/${encodeURIComponent(slug)}`);
    }
  };

  const headlineId = `promotion-popup-headline-${activePopup.id}`;

  return (
    <div className={styles.overlay} role="presentation" onClick={dismiss}>
      {eligiblePopups.length > 1 && (
        <>
          <button
            type="button"
            className={styles.prevButton}
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex((prev) => (prev - 1 + eligiblePopups.length) % eligiblePopups.length);
            }}
            aria-label="Previous popup"
          >
            <ChevronLeft size={32} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className={styles.nextButton}
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex((prev) => (prev + 1) % eligiblePopups.length);
            }}
            aria-label="Next popup"
          >
            <ChevronRight size={32} strokeWidth={1.5} />
          </button>
        </>
      )}

      <div
        className={styles.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headlineId}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className={styles.close} onClick={dismiss} aria-label="Close promotion">
          ×
        </button>

        <div className={styles.carouselContainer} key={activePopup.id}>
          <div className={styles.media}>
            {activePopup.mediaKind === "video" ? (
              <video
                className={styles.mediaVideo}
                src={activePopup.mediaUrl}
                poster={activePopup.posterUrl.trim() || undefined}
                muted
                playsInline
                loop
                autoPlay
                preload="metadata"
                aria-hidden
              />
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.mediaImg} src={activePopup.mediaUrl} alt="" decoding="async" />
              </>
            )}
          </div>
          <div className={styles.copy}>
            <h2 id={headlineId} className={styles.headline}>
              {activePopup.headline}
            </h2>
            {activePopup.body.trim() ? <p className={styles.body}>{activePopup.body}</p> : null}
            <button type="button" className={styles.cta} onClick={onCta}>
              {(activePopup.buttonLabel || "Learn more").trim()}
            </button>
          </div>
        </div>
      </div>

      {eligiblePopups.length > 1 && (
        <div className={styles.dotsContainer} onClick={(e) => e.stopPropagation()}>
          {eligiblePopups.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              className={`${styles.dot} ${idx === currentIndex ? styles.dotActive : ""}`}
              aria-label={`Show popup ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
