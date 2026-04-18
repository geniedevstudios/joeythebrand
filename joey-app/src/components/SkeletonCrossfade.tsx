"use client";

import { useEffect, useState, type ReactNode } from "react";
import styles from "./SkeletonCrossfade.module.css";

const FADE_MS = 480;

type Props = {
  isLoading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Stacks skeleton and loaded content in the same layout cell, then cross-fades
 * when `isLoading` becomes false so the swap feels intentional, not abrupt.
 */
export function SkeletonCrossfade({ isLoading, skeleton, children, className }: Props) {
  const [skeletonPassOccurred, setSkeletonPassOccurred] = useState(isLoading);
  const [fadeOutSkeleton, setFadeOutSkeleton] = useState(false);
  const [removeSkeleton, setRemoveSkeleton] = useState(() => !isLoading);

  useEffect(() => {
    if (isLoading) {
      queueMicrotask(() => setSkeletonPassOccurred(true));
    }
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) {
      queueMicrotask(() => {
        setFadeOutSkeleton(false);
        setRemoveSkeleton(false);
      });
      return;
    }
    const showContentWithFade = skeletonPassOccurred;
    if (!showContentWithFade) {
      queueMicrotask(() => {
        setFadeOutSkeleton(true);
        setRemoveSkeleton(true);
      });
      return;
    }
    let innerRaf = 0;
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(() => setFadeOutSkeleton(true));
    });
    const t = window.setTimeout(() => setRemoveSkeleton(true), FADE_MS);
    return () => {
      cancelAnimationFrame(outerRaf);
      if (innerRaf) cancelAnimationFrame(innerRaf);
      window.clearTimeout(t);
    };
  }, [isLoading, skeletonPassOccurred]);

  const showContent = !isLoading && (!skeletonPassOccurred || fadeOutSkeleton);

  return (
    <div className={`${styles.root} ${className ?? ""}`}>
      {!removeSkeleton ? (
        <div
          className={`${styles.layer} ${styles.skeletonLayer} ${fadeOutSkeleton ? styles.skeletonLayerOut : ""}`}
          aria-hidden={!isLoading}
        >
          {skeleton}
        </div>
      ) : null}
      <div
        className={`${styles.layer} ${styles.contentLayer} ${showContent ? styles.contentLayerIn : ""}`}
        aria-hidden={isLoading}
      >
        {children}
      </div>
    </div>
  );
}
