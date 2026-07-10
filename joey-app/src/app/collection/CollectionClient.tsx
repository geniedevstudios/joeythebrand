"use client";
import { useSyncExternalStore, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { dataStore } from "@/lib/dataStore";
import { slideshowImagesForCollectionBlob } from "@/lib/collectionBlobImages";
import styles from "./CollectionClient.module.css";
import { useStoreLoading } from "@/hooks/useStoreLoading";
import PageHeroShellImageLoader from "@/components/page-hero/PageHeroShellImageLoader";
import { PAGE_HERO_SHELL_CLASS, usePageHeroShellRenderProps } from "@/hooks/usePageHero";
import { SkeletonCrossfade } from "@/components/SkeletonCrossfade";
import type { Product, PublicCollection } from "@/lib/types";

type CollectionRowData = PublicCollection & { images: string[] };

function useReveal() {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setIsVisible(true);
        });
      },
      { threshold: 0.15 },
    );

    if (domRef.current) observer.observe(domRef.current);
    return () => observer.disconnect();
  }, []);

  return { isVisible, domRef };
}

function CollectionEditorialSkeleton() {
  return (
    <div className={styles.editorialSkeletonRoot}>
      {[0, 1, 2].map((i) => (
        <section key={i} className={styles.editorialSkeletonSection}>
          <div className="container">
            <div className={styles.carouselRow}>
              <div className={styles.carouselMainCol}>
                <div className="skeleton" style={{ width: "100%", aspectRatio: "4/5", borderRadius: 8 }} />
              </div>
              <div className={styles.carouselInfoCol}>
                <div className="skeleton" style={{ height: "3rem", width: "80%", marginBottom: 24 }} />
                <div className="skeleton" style={{ height: 16, width: "100%", marginBottom: 12 }} />
                <div className="skeleton" style={{ height: 16, width: "95%", marginBottom: 12 }} />
                <div className="skeleton" style={{ height: 16, width: "90%", marginBottom: 32 }} />
                <div className="skeleton" style={{ height: 50, width: 200, borderRadius: 999, marginBottom: 40 }} />
                <div className={styles.thumbnailsContainer}>
                  <div className="skeleton" style={{ flex: 1, aspectRatio: "3/4", borderRadius: 8 }} />
                  <div className="skeleton" style={{ flex: 1, aspectRatio: "3/4", borderRadius: 8 }} />
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}



const EMPTY_ARRAY: Product[] = [];
const FALLBACK_FN = () => [];
const EMPTY_ARRAY_FN = () => EMPTY_ARRAY;
const _getCollections = () => dataStore.getCollections();
const _getProducts = () => dataStore.getProducts();

const SECTION_THEME_IDS = ["warm", "dark", "paper", "earth"] as const;

function CollectionCarouselRow({
  col,
  idx,
}: {
  col: CollectionRowData;
  idx: number;
}) {
  const { isVisible, domRef } = useReveal();
  const themeId = SECTION_THEME_IDS[idx % SECTION_THEME_IDS.length];
  
  // Prefer the 3 explicit images, otherwise fallback to derived images
  const explicitImages = [col.image, col.image2, col.image3].filter(Boolean) as string[];
  const displayImages = explicitImages.length > 0 ? explicitImages : col.images.slice(0, 3);
  const imagesToRender = displayImages.length > 0 ? displayImages : [""];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (imagesToRender.length < 2) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % imagesToRender.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [imagesToRender.length]);

  const brief = (col.briefDescription || "").trim();
  const detailed = (col.description || "").trim();
  const same = brief.length > 0 && detailed.length > 0 && brief === detailed;
  const showBriefLead = brief.length > 0 && detailed.length > 0 && !same;
  const bodyText = detailed || brief;

  const thumb1 = imagesToRender[(currentIndex + 1) % imagesToRender.length];
  const thumb2 = imagesToRender[(currentIndex + 2) % imagesToRender.length];

  return (
    <section
      ref={domRef}
      data-theme={themeId}
      className={`${styles.carouselSection} ${isVisible ? styles.rowVisible : styles.rowHidden}`}
      style={{ zIndex: idx + 1, padding: 'var(--space-4xl) 0' }}
    >
      <div className="container">
        <div className={`${styles.carouselRow} ${idx % 2 !== 0 ? styles.rowReverse : ""}`}>
          <div className={`${styles.carouselMainCol} ${styles.animateIn}`}>
            <div className={styles.mainImageWrapper}>
              {imagesToRender.map((img, i) => {
                const dist = (i - currentIndex + imagesToRender.length) % imagesToRender.length;
                let posClass = styles.mainNext;
                if (dist === 0) posClass = styles.mainActive;
                if (dist === imagesToRender.length - 1 && imagesToRender.length > 1) posClass = styles.mainPrev;
                
                return (
                  <img
                    key={i}
                    src={img}
                    alt={col.name}
                    className={`${styles.mainImage} ${posClass}`}
                  />
                );
              })}
            </div>
          </div>

          <div className={`${styles.carouselInfoCol} ${styles.animateInSlow}`}>
            <h2 className={styles.collectionTitle}>{col.name}</h2>
            
            <div className={styles.collectionText}>
              {showBriefLead ? (
                <p className={styles.briefLead}>{brief}</p>
              ) : null}
              {bodyText ? (
                <p className={styles.bodyText}>{bodyText}</p>
              ) : null}
            </div>

            <Link href={`/collection/${col.slug}`} className={styles.viewPiecesBtn}>
              <span>VIEW PIECES</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </Link>

            {imagesToRender.length > 1 && (
              <div className={styles.thumbnailsContainer}>
                {imagesToRender.map((img, i) => {
                  const dist = (i - currentIndex + imagesToRender.length) % imagesToRender.length;
                  let posClass = "";
                  if (dist === 0) posClass = styles.thumbOut;
                  else if (dist === 1) posClass = styles.thumbSlot1;
                  else if (dist === 2) posClass = styles.thumbSlot2;
                  
                  return (
                    <div key={i} className={`${styles.thumbItem} ${posClass}`}>
                      <img src={img} alt="thumbnail" className={styles.thumbnailImage} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
export default function CollectionClient() {
  const collections = useSyncExternalStore(dataStore.subscribe, _getCollections, FALLBACK_FN);
  const products = useSyncExternalStore(dataStore.subscribe, _getProducts, EMPTY_ARRAY_FN);
  const isStoreLoading = useStoreLoading();
  const {
    empty: collectionHeroEmpty,
    shellSpinner: collectionHeroSpinner,
    style: collectionHeroStyle,
    showImageLoader: collectionHeroImageLoader,
  } = usePageHeroShellRenderProps("collection");

  const list = collections;


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
    <div className={styles.page}>

      {/* Page header */}
      <div
        className={`${PAGE_HERO_SHELL_CLASS} ${styles.pageHeader}`}
        data-page-hero-empty={collectionHeroEmpty ? "true" : "false"}
        data-page-hero-loading={collectionHeroSpinner ? "true" : "false"}
        style={collectionHeroStyle}
      >
        {collectionHeroImageLoader ? <PageHeroShellImageLoader /> : null}
        <div className="container">
          <span className="section-label">THE GALLERY</span>
          <h1 className={`t-display ${styles.pageTitle}`}>Collections</h1>
          <p className={styles.pageSubtext}>Explore the curated statement pieces from Joey The brand.</p>
        </div>
      </div>

      {/* Collections Editorial List */}
      <div className={styles.editorialList}>
        <SkeletonCrossfade
          isLoading={isStoreLoading}
          skeleton={<CollectionEditorialSkeleton />}
        >
          {!isStoreLoading ? (
            collectionData.length > 0 ? (
              collectionData.map((col, idx) => (
                <CollectionCarouselRow
                  key={col.id}
                  col={col}
                  idx={idx}
                />
              ))
            ) : (
              <div className="container" style={{ padding: "8rem 2rem", textAlign: "center" }}>
                <p className="t-body" style={{ color: "var(--alaska-gray)", fontStyle: "italic" }}>
                  No collections are currently available. Please check back soon.
                </p>
              </div>
            )
          ) : null}
        </SkeletonCrossfade>
      </div>
    </div>
  );
}
