"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { dataStore, SHOP_COLLECTIONS_FALLBACK } from "@/lib/dataStore";
import type { PublicCollection } from "@/lib/types";
import styles from "./CollectionsSection.module.css";

export default function CollectionsSection({ initialCollections }: { initialCollections?: PublicCollection[] }) {
  const isFallback = (cols?: PublicCollection[] | null) =>
    !!cols?.length && cols.every((c) => typeof c.id === "string" && c.id.startsWith("fallback-"));

  const collections = useSyncExternalStore(
    dataStore.subscribe,
    dataStore.getCollections,
    () => (initialCollections && initialCollections.length > 0 ? initialCollections : SHOP_COLLECTIONS_FALLBACK),
  );

  const list =
    collections?.length && !isFallback(collections)
      ? collections
      : initialCollections && initialCollections.length > 0
        ? initialCollections
        : SHOP_COLLECTIONS_FALLBACK;

  if (!list || list.length === 0) return null;

  return (
    <section className={styles.collectionsSection} aria-labelledby="home-collections-heading">
      <div className="container">
        <div className={styles.headerRow}>
          <div>
            <span className="section-label">Archive</span>
            <h2 id="home-collections-heading" className={styles.collectionsHeading}>
              Curated statement pieces from Joey The brand.
            </h2>
            <p className={styles.collectionsIntro}>
              Every collection tells a unique silhouette story.
            </p>
          </div>
          <Link
            href="/collection"
            className={`btn btn-outline ${styles.viewAll}`}
            id="home-collections-view-all"
          >
            Explore archive
          </Link>
        </div>

        <div className={styles.collectionsGrid}>
          {list.map((col) => (
            <article key={col.id} className={styles.card}>
              <div className={styles.imageWrap}>
                <img 
                  src={col.image || "/lookbook.png"} 
                  alt={col.name} 
                  className={styles.imagePrimary} 
                  loading="lazy" 
                />
                {col.hoverImage && (
                  <img 
                    src={col.hoverImage} 
                    alt="" 
                    className={styles.imageHover} 
                    loading="lazy" 
                  />
                )}
              </div>

              {/* Persistent text on image */}
              <div className={styles.textOverlay}>
                <h3 className={styles.collectionName}>{col.name}</h3>
                {col.description ? (
                  <p className={styles.collectionDesc}>{col.description}</p>
                ) : null}
              </div>

              {/* Hover actions overlay */}
              <div className={styles.overlay}>
                <div className={styles.pickMeWrap}>
                  <Link
                    href={`/collection/${col.slug}`}
                    className={styles.pickMeBtn}
                    aria-label={`View ${col.name}`}
                  >
                    VIEW PIECES
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
