"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useSyncExternalStore, useState, useEffect } from "react";
import { dataStore } from "@/lib/dataStore";
import { useStoreLoading } from "@/hooks/useStoreLoading";
import type { Product, PublicCollection } from "@/lib/types";
import { slideshowImagesForCollectionBlob } from "@/lib/collectionBlobImages";
import styles from "./CollectionsSection.module.css";

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
const EMPTY_COLLECTIONS: PublicCollection[] = [];
const _getEmptyProducts = () => EMPTY_PRODUCTS;
const _getCollections = () => dataStore.getCollections();
const _getProducts = () => dataStore.getProducts();

function TypewriterText({ text, isActive, speed = 25, delay = 0 }: { text: string, isActive: boolean, speed?: number, delay?: number }) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    if (!isActive) {
      setDisplayedText("");
      return;
    }

    let currentIndex = 0;
    let timeoutId: ReturnType<typeof setTimeout>;
    let intervalId: ReturnType<typeof setInterval>;

    timeoutId = setTimeout(() => {
      if (text.length === 0) return;
      setDisplayedText(text.slice(0, 1));
      currentIndex = 1;

      intervalId = setInterval(() => {
        if (currentIndex >= text.length) {
          clearInterval(intervalId);
          return;
        }
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      }, speed);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [isActive, text, speed, delay]);

  return <>{displayedText}</>;
}

function CollectionsSkeleton() {
  return (
    <div className={styles.bentoContainer}>
      <div className={styles.leftColumn}>
        <div className="skeleton" style={{ flex: 1, borderRadius: 16 }} />
        <div className={styles.bottomCards}>
          <div className="skeleton" style={{ height: "100%", borderRadius: 16 }} />
          <div className="skeleton" style={{ height: "100%", borderRadius: 16 }} />
        </div>
      </div>
      <div className="skeleton" style={{ height: "100%", borderRadius: 16 }} />
    </div>
  );
}

export default function CollectionsSection({
  initialCollections,
  headingId = "home-collections-heading",
  viewAllId = "home-collections-view-all",
  ctaLabel = "Explore our gallery",
}: CollectionsSectionProps) {
  const collections = useSyncExternalStore(
    dataStore.subscribe,
    _getCollections,
    () => (initialCollections ?? EMPTY_COLLECTIONS),
  );

  const products = useSyncExternalStore(dataStore.subscribe, _getProducts, _getEmptyProducts);
  const isStoreLoading = useStoreLoading();

  const [activeIndex, setActiveIndex] = useState(0);

  const list = collections;

  // Auto-cycle the active collection every 5 seconds
  useEffect(() => {
    if (!list || list.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % list.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [list]);

  if (!list || list.length === 0) return null;

  // Enhance collections with their respective product images
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

        {isStoreLoading ? (
          <CollectionsSkeleton />
        ) : (
          <>
            <div className={styles.bentoContainer}>
              {collectionData.map((col, idx) => {
                const isActive = idx === activeIndex;

                // Fallbacks if a collection lacks multiple images
                const mainImage = col.image || col.images[0] || "/placeholder-collection.jpg";
                const img2 = col.image2 || col.images[1] || mainImage;
                const img3 = col.image3 || col.images[2] || mainImage;

                return (
                  <div key={col.id} className={`${styles.bentoSlide} ${isActive ? styles.active : ""}`}>
                    <div className={styles.leftColumn}>
                      <Link href={`/collection/${col.slug}`} className={styles.textBlock}>
                        <div className={styles.arrowIcon}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M7 17L17 7"></path>
                            <path d="M7 7h10v10"></path>
                          </svg>
                        </div>
                        <div>
                          <h3 style={{ minHeight: "1.2em" }}>
                            <TypewriterText text={col.name || "Silence is not quiet enough."} isActive={isActive} delay={400} speed={40} />
                          </h3>
                          <p className={styles.textBlockDesc} style={{ minHeight: "3em" }}>
                            <TypewriterText text={col.briefDescription || col.description || "Every collection tells a unique silhouette story."} isActive={isActive} delay={900} speed={25} />
                          </p>
                        </div>
                        <div className={styles.linesDecoration}>
                          <div className={`${styles.line} ${styles.short}`}></div>
                          <div className={`${styles.line} ${styles.medium}`}></div>
                        </div>
                      </Link>

                      <div className={styles.bottomCards}>
                        <Link href={`/collection/${col.slug}`} className={styles.smallCard}>
                          <img src={img2} alt="" className={styles.cardImage} loading="lazy" />
                          <div className={styles.cardOverlay}>
                            <p className={styles.cardLabel}>For the clan...</p>
                          </div>
                        </Link>
                        <Link href={`/collection/${col.slug}`} className={styles.smallCard}>
                          <img src={img3} alt="" className={styles.cardImage} loading="lazy" />
                          <div className={styles.cardOverlay}>
                            <p className={styles.cardLabel}>the selected few.</p>
                          </div>
                        </Link>
                      </div>
                    </div>

                    <div className={styles.rightColumn}>
                      <img src={mainImage} alt={col.name} className={styles.cardImage} loading="lazy" />
                      <div className={styles.cardOverlay} style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0) 100%)' }}></div>

                      <div className={styles.rightContent}>
                        <div className={styles.buttonRow}>
                          <Link href={`/collection/${col.slug}`} className={styles.pickMeBtn}>
                            VIEW PIECES
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={styles.indicators}>
              {collectionData.map((_, idx) => (
                <button
                  key={idx}
                  className={`${styles.indicator} ${idx === activeIndex ? styles.active : ""}`}
                  onClick={() => setActiveIndex(idx)}
                  aria-label={`Go to collection ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
