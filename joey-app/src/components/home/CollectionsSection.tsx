"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useSyncExternalStore, useState, useEffect } from "react";
import { dataStore, SHOP_COLLECTIONS_FALLBACK } from "@/lib/dataStore";
import { useStoreLoading } from "@/hooks/useStoreLoading";
import type { Product, PublicCollection } from "@/lib/types";
import { slideshowImagesForCollectionBlob } from "@/lib/collectionBlobImages";
import styles from "./CollectionsSection.module.css";

function CardSlideshow({
  images,
  fallbackImage,
}: {
  images: string[];
  fallbackImage?: string;
}) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % images.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [images]);

  const validFallback =
    fallbackImage?.startsWith("/") || fallbackImage?.startsWith("http")
      ? fallbackImage
      : null;
  const renderImages =
    images.length > 0 ? images : validFallback ? [validFallback] : [];

  return (
    <>
      {renderImages.map((img, i) => (
        <img
          key={`${img}-${i}`}
          src={img}
          alt=""
          className={`${styles.cardImage} ${i === activeIdx ? styles.imageActive : ""}`}
          loading="lazy"
        />
      ))}
    </>
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

const EMPTY_PRODUCTS: Product[] = [];
const _getEmptyProducts = () => EMPTY_PRODUCTS;
const _getCollections = () => dataStore.getCollections();
const _getProducts = () => dataStore.getProducts();

function CollectionsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <article key={i} className={`${styles.card} ${styles.spanNormal}`}>
          <div className={styles.imageWrap}>
            <div className="skeleton" style={{ width: "100%", height: "100%" }} />
          </div>
          <div className={styles.textOverlay}>
            <div className="skeleton" style={{ height: 20, width: "60%", marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 14, width: "80%" }} />
          </div>
        </article>
      ))}
    </>
  );
}

const BENTO_CLASSES = [
  "spanLarge",
  "spanTall",
  "spanNormal",
  "spanNormal",
  "spanWide",
  "spanNormal",
  "spanTall",
  "spanLarge",
  "spanNormal",
  "spanWide",
];

export default function CollectionsSection({
  initialCollections,
  headingId = "home-collections-heading",
  viewAllId = "home-collections-view-all",
  ctaLabel = "Explore our gallery",
}: CollectionsSectionProps) {
  const isFallback = (cols?: PublicCollection[] | null) =>
    !!cols?.length && cols.every((c) => typeof c.id === "string" && c.id.startsWith("fallback-"));

  const collections = useSyncExternalStore(
    dataStore.subscribe,
    _getCollections,
    () => (initialCollections && initialCollections.length > 0 ? initialCollections : SHOP_COLLECTIONS_FALLBACK),
  );

  const products = useSyncExternalStore(dataStore.subscribe, _getProducts, _getEmptyProducts);
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
    const colProducts = products.filter(
      (p) =>
        p.category?.toLowerCase() === col.slug?.toLowerCase() ||
        p.categoryName?.toLowerCase() === col.name?.toLowerCase() ||
        p.category?.toLowerCase() === col.name?.toLowerCase() ||
        p.category?.toLowerCase() === col.slug?.replace(/-/g, " ").toLowerCase(),
    );

    const images = slideshowImagesForCollectionBlob(col, colProducts, 8);

    return {
      ...col,
      images,
    };
  });

  return (
    <section className={styles.collectionsSection} aria-labelledby={headingId}>
      <div className="container">
        <div className={styles.headerRow}>
          <div>
            <span className="section-label">Gallery</span>
            <h2 id={headingId} className={styles.collectionsHeading}>
              Curated statement pieces from Joey The brand.
            </h2>
            <p className={styles.collectionsIntro}>
              Every collection tells a unique silhouette story.
            </p>
          </div>
          <Link href="/collection" className={`btn btn-outline ${styles.viewAll}`} id={viewAllId}>
            {ctaLabel}
          </Link>
        </div>

        <div className={styles.collectionsGrid}>
          {isStoreLoading && isFallback(list) ? (
            <CollectionsSkeleton count={6} />
          ) : (
            collectionData.map((col, idx) => {
              const spanClass = styles[BENTO_CLASSES[idx % BENTO_CLASSES.length]];
              return (
                <Link key={col.id} href={`/collection/${col.slug}`} className={`${styles.card} ${spanClass}`}>
                  <div className={styles.imageWrap}>
                    <CardSlideshow images={col.images} fallbackImage={col.image} />
                  </div>

                  <div className={styles.textOverlay}>
                    <h3 className={styles.collectionName}>{col.name}</h3>
                    {(col.briefDescription || col.description)?.trim() ? (
                      <p className={styles.collectionDesc}>{(col.briefDescription || col.description).trim()}</p>
                    ) : null}
                  </div>
                  
                  <div className={styles.blobOverlay}>
                    <span className={styles.pickMeBtn}>VIEW PIECES</span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
