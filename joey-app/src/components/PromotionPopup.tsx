"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { dataStore } from "@/lib/dataStore";
import type { PromotionPopupConfig } from "@/lib/types";
import styles from "./PromotionPopup.module.css";

function storeSubscribe(cb: () => void) {
  return dataStore.subscribe(cb);
}

type PopupStoreState = { appliedFromRemote: boolean; popup: PromotionPopupConfig };

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

type Props = {
  /** From root layout SSR so the modal can show on hard refresh before `dataStore.init()` finishes. */
  initialPromotionPopup: PromotionPopupConfig;
};

export default function PromotionPopup({ initialPromotionPopup }: Props) {
  const router = useRouter();

  /** Must be referentially stable whenever inputs are unchanged (React useSyncExternalStore + getServerSnapshot). */
  const serverSnapshot = useMemo(
    (): PopupStoreState => ({ appliedFromRemote: false, popup: initialPromotionPopup }),
    [initialPromotionPopup],
  );

  const getServerSnapshot = useCallback(() => serverSnapshot, [serverSnapshot]);

  const clientSnapshotCache = useRef<PopupStoreState | null>(null);

  const getSnapshot = useCallback((): PopupStoreState => {
    const appliedFromRemote = dataStore.hasAppliedSiteContentFromRemote();
    const popup = appliedFromRemote ? dataStore.getSiteContent().promotionPopup : initialPromotionPopup;

    const prev = clientSnapshotCache.current;
    if (
      prev &&
      prev.appliedFromRemote === appliedFromRemote &&
      (prev.popup === popup || popupConfigEqual(prev.popup, popup))
    ) {
      return prev;
    }

    const next: PopupStoreState = { appliedFromRemote, popup };
    clientSnapshotCache.current = next;
    return next;
  }, [initialPromotionPopup]);

  const { popup } = useSyncExternalStore(storeSubscribe, getSnapshot, getServerSnapshot);
  const [dismissed, setDismissed] = useState(false);

  const eligible = useMemo(() => {
    return (
      popup.enabled &&
      popup.mediaUrl.trim().length > 0 &&
      popup.headline.trim().length > 0
    );
  }, [popup.enabled, popup.mediaUrl, popup.headline]);

  const visible = !dismissed && eligible;

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

  const dismiss = useCallback(() => setDismissed(true), []);

  const onCta = () => {
    dismiss();
    const slug = popup.productSlugOrId.trim();
    if (popup.action === "newsletter") {
      window.requestAnimationFrame(() => {
        document.getElementById("footer-newsletter")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }
    if (popup.action === "news") {
      router.push("/news");
      return;
    }
    if (popup.action === "product") {
      if (!slug) return;
      router.push(`/shop/${encodeURIComponent(slug)}`);
    }
  };

  if (!visible) return null;

  const headlineId = "promotion-popup-headline";

  return (
    <div className={styles.overlay} role="presentation" onClick={dismiss}>
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
        <div className={styles.media}>
          {popup.mediaKind === "video" ? (
            <video
              className={styles.mediaVideo}
              src={popup.mediaUrl}
              poster={popup.posterUrl.trim() || undefined}
              muted
              playsInline
              loop
              autoPlay
              preload="metadata"
              aria-hidden
            />
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- remote CMS / Supabase URLs */}
              <img className={styles.mediaImg} src={popup.mediaUrl} alt="" decoding="async" />
            </>
          )}
        </div>
        <div className={styles.copy}>
          <h2 id={headlineId} className={styles.headline}>
            {popup.headline}
          </h2>
          {popup.body.trim() ? <p className={styles.body}>{popup.body}</p> : null}
          <button type="button" className={styles.cta} onClick={onCta}>
            {(popup.buttonLabel || "Learn more").trim()}
          </button>
        </div>
      </div>
    </div>
  );
}
