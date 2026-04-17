"use client";

import Link from "next/link";
import { useSyncExternalStore, useState, useEffect } from "react";
import { dataStore, SHOP_COLLECTIONS_FALLBACK } from "@/lib/dataStore";
import { useStoreLoading } from "@/hooks/useStoreLoading";
import type { PublicCollection } from "@/lib/types";
import { slideshowImagesForCollectionBlob } from "@/lib/collectionBlobImages";
import styles from "./CollectionsSection.module.css";


const BLOB_PATHS = [
  "M0.8,0.2 C0.9,0.3, 0.9,0.7, 0.75,0.85 C0.6,1, 0.3,0.9, 0.15,0.7 C0,0.5, 0,0.3, 0.2,0.15 C0.4,0, 0.6,0.1, 0.8,0.2 Z",
  "M0.6,0.1 C0.8,0.1, 1,0.4, 0.9,0.7 C0.8,1, 0.5,1, 0.2,0.9 C-0.1,0.8, 0,0.4, 0.1,0.2 C0.2,0, 0.4,0.1, 0.6,0.1 Z",
  "M0.75,0.15 C0.95,0.25, 1,0.6, 0.8,0.8 C0.6,1, 0.3,1, 0.15,0.8 C0,0.6, 0,0.3, 0.15,0.15 C0.3,0, 0.55,0.05, 0.75,0.15 Z",
  "M0.35,0.05 C0.65,-0.05, 0.9,0.2, 0.95,0.5 C1,0.8, 0.7,1, 0.4,0.95 C0.1,0.9, 0,0.6, 0,0.3 C0,0, 0.05,0.15, 0.35,0.05 Z",
  "M0.5,0.06 C0.82,0.06 0.94,0.32 0.91,0.52 C0.88,0.78 0.68,0.96 0.5,0.96 C0.32,0.96 0.12,0.78 0.09,0.52 C0.06,0.32 0.18,0.06 0.5,0.06 Z",
  "M0.5,0.03 C0.7,0.14 0.86,0.42 0.84,0.66 C0.82,0.9 0.58,0.97 0.5,0.97 C0.42,0.97 0.18,0.9 0.16,0.66 C0.14,0.42 0.3,0.14 0.5,0.03 Z",
  "M0.5,0.04 L0.86,0.3 C0.96,0.46 0.93,0.7 0.72,0.9 L0.5,0.97 L0.28,0.9 C0.07,0.7 0.04,0.46 0.14,0.3 Z",
  "M0.28,0.14 C0.12,0.34 0.1,0.62 0.24,0.86 C0.4,0.97 0.64,0.94 0.8,0.78 C0.96,0.58 0.98,0.34 0.84,0.16 C0.68,0.04 0.42,0.04 0.28,0.14 Z",
];

function CollectionBlobViewer({ 
  images, 
  slug, 
  blobIndex, 
  fallbackImage 
}: { 
  images: string[], 
  slug: string, 
  blobIndex: number, 
  fallbackImage?: string 
}) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % images.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [images]);

  const clipId = `blob-mask-${blobIndex % BLOB_PATHS.length}`;
  const validFallback = (fallbackImage?.startsWith("/") || fallbackImage?.startsWith("http")) ? fallbackImage : null;
  const renderImages = images.length > 0 ? images : validFallback ? [validFallback] : [];

  return (
    <Link href={`/collection/${slug}`} className={styles.blobViewerWrapper} aria-label={`View ${slug} collection pieces`}>
      <div 
        className={styles.blobContainer} 
        style={{ 
          clipPath: `url(#${clipId})`,
          WebkitClipPath: `url(#${clipId})` // Safari support
        }}
      >
        {renderImages.map((img, i) => (
          <img 
            key={`${img}-${i}`} 
            src={img} 
            alt="Collection product" 
            className={`${styles.blobImage} ${i === activeIdx ? styles.blobImageActive : ''}`} 
            loading="lazy" 
          />
        ))}
        <div className={styles.blobOverlay}>
            <span className={styles.pickMeBtn}>VIEW PIECES</span>
        </div>
      </div>
    </Link>
  );
}

type CollectionsSectionProps = {
  initialCollections?: PublicCollection[];
  /** `id` on the `<h2>`; also used for the section `aria-labelledby`. */
  headingId?: string;
  /** `id` on the primary CTA link (e.g. analytics). */
  viewAllId?: string;
  /** CTA label; defaults to home copy. */
  ctaLabel?: string;
};

const EMPTY_ARRAY: any[] = [];
const _getEmptyArray = () => EMPTY_ARRAY;
const _getCollections = () => dataStore.getCollections();
const _getProducts = () => dataStore.getProducts();

function CollectionsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className={styles.collectionsGrid}>
      {Array.from({ length: count }).map((_, i) => (
        <article key={i} className={styles.card}>
          <div className={styles.imageWrap}>
            <div
              className="skeleton"
              style={{
                borderRadius: "50% 40% 55% 45% / 45% 55% 45% 55%",
                aspectRatio: "1/1",
                width: "100%",
              }}
            />
          </div>
          <div className={styles.textOverlay}>
            <div className="skeleton" style={{ height: 20, width: "60%", marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 14, width: "80%" }} />
          </div>
        </article>
      ))}
    </div>
  );
}


export default function CollectionsSection({
  initialCollections,
  headingId = "home-collections-heading",
  viewAllId = "home-collections-view-all",
  ctaLabel = "Explore all archives",
}: CollectionsSectionProps) {
  const isFallback = (cols?: PublicCollection[] | null) =>
    !!cols?.length && cols.every((c) => typeof c.id === "string" && c.id.startsWith("fallback-"));

  const collections = useSyncExternalStore(
    dataStore.subscribe,
    _getCollections,
    () => (initialCollections && initialCollections.length > 0 ? initialCollections : SHOP_COLLECTIONS_FALLBACK),
  );

  const products = useSyncExternalStore(dataStore.subscribe, _getProducts, _getEmptyArray);
  const isStoreLoading = useStoreLoading();

  const list =
    collections?.length && !isFallback(collections)
      ? collections
      : initialCollections && initialCollections.length > 0
        ? initialCollections
        : SHOP_COLLECTIONS_FALLBACK;

  if (!list || list.length === 0) return null;


  // Enhance collections with their respective product images for the slideshow
  const collectionData = list.map((col) => {
    const colProducts = products.filter(p => 
      p.category?.toLowerCase() === col.slug?.toLowerCase() ||
      p.categoryName?.toLowerCase() === col.name?.toLowerCase() || 
      p.category?.toLowerCase() === col.name?.toLowerCase() ||
      p.category?.toLowerCase() === col.slug?.replace(/-/g, " ").toLowerCase()
    );
    
    const images = slideshowImagesForCollectionBlob(col, colProducts, 8);

    return {
      ...col,
      images,
    };
  });

  return (
    <section className={styles.collectionsSection} aria-labelledby={headingId}>
      <svg width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }}>
        <defs>
          {BLOB_PATHS.map((path, idx) => (
            <clipPath key={`clip-${idx}`} id={`blob-mask-${idx}`} clipPathUnits="objectBoundingBox">
              <path d={path} />
            </clipPath>
          ))}
        </defs>
      </svg>

      <div className="container">
        <div className={styles.headerRow}>
          <div>
            <span className="section-label">Archive</span>
            <h2 id={headingId} className={styles.collectionsHeading}>
              Curated statement pieces from Joey The brand.
            </h2>
            <p className={styles.collectionsIntro}>
              Every collection tells a unique silhouette story.
            </p>
          </div>
          <Link
            href="/collection"
            className={`btn btn-outline ${styles.viewAll}`}
            id={viewAllId}
          >
            {ctaLabel}
          </Link>
        </div>

        <div className={styles.collectionsGrid}>
          {isStoreLoading && isFallback(list) ? (
            <CollectionsSkeleton count={3} />
          ) : (
            collectionData.map((col, idx) => (
              <article key={col.id} className={styles.card}>
                 <div className={styles.imageWrap}>
                   <CollectionBlobViewer
                     images={col.images}
                     slug={col.slug}
                     blobIndex={idx}
                     fallbackImage={col.image}
                   />
                 </div>

                 <div className={styles.textOverlay}>
                   <h3 className={styles.collectionName}>{col.name}</h3>
                   {(col.briefDescription || col.description)?.trim() ? (
                     <p className={styles.collectionDesc}>{(col.briefDescription || col.description).trim()}</p>
                   ) : null}
                 </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
