"use client";
import { useSyncExternalStore, useState, useEffect, useRef } from "react";
import { dataStore, SHOP_COLLECTIONS_FALLBACK } from "@/lib/dataStore";
import { slideshowImagesForCollectionBlob } from "@/lib/collectionBlobImages";
import styles from "./CollectionClient.module.css";
import { useStoreLoading } from "@/hooks/useStoreLoading";
import { PAGE_HERO_SHELL_CLASS, usePageHeroBackgroundStyle, usePageHeroEmpty } from "@/hooks/usePageHero";
import { CollectionBlobClipDefs, CollectionBlobViewer } from "@/components/collection/CollectionBlobViewer";


/** Visual rhythm for section shells (gradients in CSS via data-theme). */
const SECTION_THEME_IDS = ["warm", "dark", "paper", "earth"] as const;

function useReveal() {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef<any>(null);

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
    <div>
      {[0, 1, 2].map((i) => (
        <section
          key={i}
          style={{
            padding: "80px 0",
            borderBottom: "1px solid var(--concerto)",
          }}
        >
          <div className="container">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "3rem",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="skeleton" style={{ height: 14, width: "60%" }} />
                <div className="skeleton" style={{ height: 14, width: "85%" }} />
                <div className="skeleton" style={{ height: 14, width: "70%" }} />
              </div>
              <div>
                <div className="skeleton" style={{ height: 36, width: "55%", marginBottom: 16 }} />
                <div
                  className="skeleton"
                  style={{
                    borderRadius: "50% 40% 55% 45% / 45% 55% 45% 55%",
                    aspectRatio: "1/1",
                    maxWidth: 340,
                    margin: "0 auto",
                  }}
                />
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}



const EMPTY_ARRAY: any[] = [];
const FALLBACK_FN = () => SHOP_COLLECTIONS_FALLBACK;
const EMPTY_ARRAY_FN = () => EMPTY_ARRAY;
const _getCollections = () => dataStore.getCollections();
const _getProducts = () => dataStore.getProducts();

function CollectionRowSection({
  col,
  idx,
  themes,
  isLast,
}: {
  col: any;
  idx: number;
  themes: any[];
  isLast: boolean;
}) {
  const theme = themes[idx % themes.length];
  const { isVisible, domRef } = useReveal();
  const themeId = SECTION_THEME_IDS[idx % SECTION_THEME_IDS.length];
  const zigEven = idx % 2 === 0;

  const brief = (col.briefDescription || "").trim();
  const detailed = (col.description || "").trim();
  const same = brief.length > 0 && detailed.length > 0 && brief === detailed;
  const showBriefLead = brief.length > 0 && detailed.length > 0 && !same;
  const bodyText = detailed || brief;

  return (
    <section
      ref={domRef}
      data-theme={themeId}
      className={`${styles.collectionRowSection} ${isVisible ? styles.rowVisible : styles.rowHidden}`}
      style={{ zIndex: idx + 1 }}
    >
      <div
        className={`${styles.sectionZigzagBg} ${zigEven ? styles.zigZagEven : styles.zigZagOdd} ${isLast ? styles.zigZagLast : ""}`}
        aria-hidden="true"
      />

      <div className="container">
        <div className={`${styles.editorialRow} ${idx % 2 !== 0 ? styles.rowReverse : ""}`}>
          <div className={`${styles.editorialText} ${styles.animateIn}`}>
            {showBriefLead ? (
              <p className={styles.collectionBriefLead} style={{ color: theme.sub }}>
                {brief}
              </p>
            ) : null}
            {bodyText ? (
              <p className={styles.collectionDesc} style={{ color: theme.sub }}>
                {bodyText}
              </p>
            ) : null}
          </div>

          <div className={`${styles.editorialVisual} ${styles.animateInSlow}`}>
            <h2 className={styles.collectionNameAboveShape} style={{ color: theme.text }}>
              {col.name}
            </h2>
            <CollectionBlobViewer
              images={col.images}
              slug={col.slug}
              blobIndex={idx}
              fallbackImage={col.image}
              variant="index"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

const THEMES = [
  { text: "var(--blue-athracite)", sub: "var(--alaska-gray)" },
  { text: "#fff", sub: "rgba(255,255,255,0.72)" },
  { text: "var(--blue-athracite)", sub: "var(--alaska-gray)" },
  { text: "#fff", sub: "rgba(255,255,255,0.82)" },
];
export default function CollectionClient() {
  const collections = useSyncExternalStore(dataStore.subscribe, _getCollections, FALLBACK_FN);
  const products = useSyncExternalStore(dataStore.subscribe, _getProducts, EMPTY_ARRAY_FN);
  const isStoreLoading = useStoreLoading();
  const collectionHeroStyle = usePageHeroBackgroundStyle("collection");
  const collectionHeroEmpty = usePageHeroEmpty("collection");

  const list = collections?.length ? collections : SHOP_COLLECTIONS_FALLBACK;


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
      <CollectionBlobClipDefs />

      {/* Page header */}
      <div
        className={`${PAGE_HERO_SHELL_CLASS} ${styles.pageHeader}`}
        data-page-hero-empty={collectionHeroEmpty ? "true" : "false"}
        style={collectionHeroStyle}
      >
        <div className="container">
          <span className="section-label">THE ARCHIVE</span>
          <h1 className={`t-display ${styles.pageTitle}`}>Collections</h1>
          <p className={styles.pageSubtext}>Explore the curated statement pieces from Joey The brand.</p>
        </div>
      </div>

      {/* Collections Editorial List */}
      <div className={styles.editorialList}>
        {isStoreLoading ? (
          <CollectionEditorialSkeleton />
        ) : (
          collectionData.map((col, idx) => (
            <CollectionRowSection
              key={col.id}
              col={col}
              idx={idx}
              themes={THEMES}
              isLast={idx === collectionData.length - 1}
            />
          ))
        )}
      </div>
    </div>
  );
}
