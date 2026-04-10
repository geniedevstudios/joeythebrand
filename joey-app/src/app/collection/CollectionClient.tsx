"use client";
import { useSyncExternalStore } from "react";
import Link from "next/link";
import { dataStore, SHOP_COLLECTIONS_FALLBACK } from "@/lib/dataStore";
import styles from "./CollectionClient.module.css";
import { usePageHeroBackgroundStyle } from "@/hooks/usePageHero";

export default function CollectionClient() {
  const collections = useSyncExternalStore(
    dataStore.subscribe,
    dataStore.getCollections,
    () => SHOP_COLLECTIONS_FALLBACK
  );
  const collectionHeroStyle = usePageHeroBackgroundStyle("collection");

  const list = collections?.length ? collections : SHOP_COLLECTIONS_FALLBACK;

  return (
    <div className={styles.page}>
      {/* Page header */}
      <div className={styles.pageHeader} style={collectionHeroStyle}>
        <div className="container">
          <span className="section-label">THE ARCHIVE</span>
          <h1 className={`t-display ${styles.pageTitle}`}>Collections</h1>
          <p className={styles.pageSubtext}>
            Explore the curated statement pieces from Joey The brand.
          </p>
        </div>
      </div>

      {/* Collections Grid */}
      <div className={`section ${styles.productsSection}`}>
        <div className="container">
          <div className={styles.grid}>
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
                
                {/* Always visible text on image */}
                <div className={styles.textOverlay}>
                  <h2 className={styles.name}>{col.name}</h2>
                  <p className={styles.desc}>{col.description}</p>
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
      </div>
    </div>
  );
}
