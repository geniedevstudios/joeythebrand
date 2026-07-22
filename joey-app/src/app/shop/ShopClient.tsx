"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef, useSyncExternalStore, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import styles from "./ShopClient.module.css";
import CollectionsSection from "@/components/home/CollectionsSection";
import { wishlistStore } from "@/store/wishlistStore";
import { dataStore, DEFAULT_SIZES, WOMENS_DEFAULT_SIZES } from "@/lib/dataStore";
import { formatSizeLabel } from "@/lib/formatSizeLabel";
import { useStoreLoading } from "@/hooks/useStoreLoading";
import PageHeroShellImageLoader from "@/components/page-hero/PageHeroShellImageLoader";
import { PAGE_HERO_SHELL_CLASS, usePageHeroShellRenderProps } from "@/hooks/usePageHero";
import ProductMedia from "@/components/shop/ProductMedia";
import SizeGuideModal, { type SizeGuideKind } from "@/components/SizeGuideModal";
import { getVariantStockStatus, getIsSoloUnavailable } from "@/lib/variantUtils";

const MAX_SEARCH_RESULTS = 6;


type WearFilter = "all" | "mens" | "womens";

const EMPTY_ARRAY: any[] = [];
const EMPTY_COLLECTIONS: any[] = [];
const _getEmptyArray = () => EMPTY_ARRAY;
const _getProducts = () => dataStore.getProducts();
const _getWishlistItems = () => wishlistStore.getItems();
const _getCollections = () => dataStore.getCollections();
const _getEmptyCollections = () => EMPTY_COLLECTIONS;

function ShopProductsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            className="skeleton"
            style={{ aspectRatio: "3/4", width: "100%", borderRadius: 8 }}
          />
          <div className="skeleton" style={{ height: 12, width: "50%", borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 18, width: "75%", borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 14, width: "40%", borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
}


const wearFilters: { id: WearFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "mens", label: "Men's wear" },
  { id: "womens", label: "Women's wear" },
];

export default function ShopClient() {
  const router = useRouter();
  const [selectedCollectionSlug, setSelectedCollectionSlug] = useState<string | null>(null);
  const [wearFilter, setWearFilter] = useState<WearFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const [quickViewPiece, setQuickViewPiece] = useState<any>(null);
  const [quickViewColorVariantId, setQuickViewColorVariantId] = useState<string>("main-color");
  const [quickViewMode, setQuickViewMode] = useState<"solo" | "paired">("solo");
  const [quickViewComboId, setQuickViewComboId] = useState<string>("");
  const [activeImage, setActiveImage] = useState<string>("");
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState("");
  const [quickViewFit, setQuickViewFit] = useState("Standard");
  const [priceFilterOpen, setPriceFilterOpen] = useState(false);
  const [tempMinPrice, setTempMinPrice] = useState("0");
  const [tempMaxPrice, setTempMaxPrice] = useState("5000");
  const [activePriceFilter, setActivePriceFilter] = useState<[number, number] | null>(null);
  const searchParams = useSearchParams();
  const products = useSyncExternalStore(dataStore.subscribe, _getProducts, _getEmptyArray);
  const collections = useSyncExternalStore(dataStore.subscribe, _getCollections, _getEmptyCollections);
  const wishlistItems = useSyncExternalStore(wishlistStore.subscribe, _getWishlistItems, _getEmptyArray);
  const isStoreLoading = useStoreLoading();
  const [addStatus, setAddStatus] = useState<"idle" | "adding" | "added">("idle");

  const sizeGuideKind: SizeGuideKind = useMemo(() => {
    const w = String(quickViewPiece?.wearTag ?? "").toLowerCase();
    if (w === "mens") return "mens";
    if (w === "womens") return "womens";
    if (w === "unisex") return "unisex";
    return "both";
  }, [quickViewPiece]);

  const getCollectionName = useCallback(
    (p: any): string => {
      const slug = String(p?.category || "").trim();
      if (!slug || slug === "none") return "";
      const match = (collections as any[]).find((c: any) => c?.slug === slug);
      return match?.name ? String(match.name) : "";
    },
    [collections],
  );

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search results (dropdown only — does NOT filter the grid)
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p: any) => {
        const colName = getCollectionName(p).toLowerCase();
        return (
          p.name?.toLowerCase().includes(q) ||
          p.categoryName?.toLowerCase().includes(q) ||
          colName.includes(q)
        );
      })
      .slice(0, MAX_SEARCH_RESULTS);
  }, [products, searchQuery, getCollectionName]);

  const scrollToPieces = useCallback(() => {
    document.getElementById("shop-pieces")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    const raw = searchParams.get("collection");
    const slug = raw?.trim() || "";
    if (!slug) return;

    // Allow direct linking from home and marketing pages.
    setSelectedCollectionSlug(slug);
    // Defer scroll until after initial render.
    setTimeout(() => scrollToPieces(), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (quickViewPiece) {
      document.body.style.overflow = "hidden";
      setQty(1);
      setSelectedSize("");
      setQuickViewColorVariantId("main-color");
      setQuickViewMode("solo");
      setQuickViewComboId("");
      if (quickViewPiece.wearTag === "womens") {
        setQuickViewFit("Standard");
      } else if (quickViewPiece.wearTag === "unisex") {
        setQuickViewFit("Men");
      } else {
        setQuickViewFit("Standard");
      }
    } else {
      document.body.style.overflow = "";
      setActiveImage("");
    }
    return () => { document.body.style.overflow = ""; };
  }, [quickViewPiece]);

  const toggleWishlist = (product: any) => {
    const wasInWishlist = isInWishlist(product.id);
    wishlistStore.toggleItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      hoverImage: product.hoverImage,
      category: product.categoryName,
    });
    toast.success(wasInWishlist ? `${product.name} removed from wishlist` : `${product.name} added to wishlist`);
  };

  const isInWishlist = (id: string) => wishlistItems.some(item => item.id === id);

  const handleAddToCart = () => {
    if (!quickViewPiece) return;
    if (!selectedSize) {
      toast.error("Please pick a size before adding to cart.");
      return;
    }

    setAddStatus("adding");

    setTimeout(() => {
      import("@/store/cartStore").then(({ cartStore }) => {
        const stockStatus = getVariantStockStatus(quickViewPiece, quickViewActiveVariant, quickViewActiveCombo, quickViewMode);
        const isBespokeProduct = stockStatus.isBespokeProduct;
        cartStore.addItem({
          productId: quickViewPiece.id,
          name: quickViewPiece.name,
          color: quickViewActiveVariant?.name ,
          colorHex: quickViewActiveVariant?.colorHex,
          combo: quickViewActiveCombo ? quickViewActiveCombo.name : undefined,
          size: selectedSize || "Standard",
          fit: (quickViewPiece.wearTag === "womens" || quickViewPiece.wearTag === "unisex") ? quickViewFit : undefined,
          wearTag: quickViewPiece.wearTag,
          price: quickViewActiveCombo ? (quickViewActiveCombo.price || quickViewPiece.price) : quickViewPiece.price,
          image: quickViewActiveCombo?.thumbnailUrl || quickViewGalleryImages[0] || quickViewPiece.image,
          image2: quickViewActiveCombo?.images?.[0] || quickViewGalleryImages[1] || quickViewPiece.images?.[0],
          quantity: qty,
          maxStock: stockStatus.maxStock ?? 99,
          isBespoke: isBespokeProduct || undefined,
          bespokeLeadDays: isBespokeProduct ? (stockStatus.bespokeLeadDays ?? 14) : undefined,
        });

        setAddStatus("added");
        setTimeout(() => setAddStatus("idle"), 2000);
      });
    }, 400);
  };

  const getAvailableSizes = (prod: any, fit?: string) => {
    // For women's apparel, the range depends on the fit.
    if (prod?.wearTag === "womens") {
      if (fit === "Thick") {
        return ["S", "M", "L", "XL", "Custom"];
      }
      return WOMENS_DEFAULT_SIZES.map(s => s.name);
    }

    if (prod?.wearTag === "unisex") {
      if (fit === "Women") {
        return ["S", "M", "L", "XL", "Custom"];
      }
      // Men's or default
      return ["S", "M", "L", "XL", "XXL", "Custom"];
    }

    if (!prod?.sizes || prod.sizes.length === 0) {
      return DEFAULT_SIZES.map(s => s.name);
    }
    return prod.sizes.filter((s: any) => s.available).map((s: any) => s.name);
  };

  const filtered = useMemo(() => {
    let list = products;
    if (selectedCollectionSlug) {
      list = list.filter((p: any) => p.category === selectedCollectionSlug);
    }
    if (wearFilter === "mens") {
      list = list.filter((p: any) => p.wearTag === "mens" || p.wearTag === "unisex");
    } else if (wearFilter === "womens") {
      list = list.filter((p: any) => p.wearTag === "womens" || p.wearTag === "unisex");
    }
    if (activePriceFilter) {
      list = list.filter((p: any) => p.price >= activePriceFilter[0] && p.price <= activePriceFilter[1]);
    }
    return list;
  }, [products, selectedCollectionSlug, wearFilter, activePriceFilter]);

  const formatPrice = (price: number) => `GHC ${price.toLocaleString()}`;
  const {
    empty: shopHeroEmpty,
    shellSpinner: shopHeroSpinner,
    style: shopHeroStyle,
    showImageLoader: shopHeroImageLoader,
    imageReady: shopHeroImageReady,
  } = usePageHeroShellRenderProps("shop");

  const quickViewColorVariants = useMemo(() => {
    if (!quickViewPiece || !quickViewPiece.variants) return [];
    return quickViewPiece.variants.filter((v: any) => v.type === "color");
  }, [quickViewPiece]);

  const quickViewActiveVariant = useMemo(() => {
    return quickViewColorVariants.find((v: any) => v.id === quickViewColorVariantId);
  }, [quickViewColorVariants, quickViewColorVariantId]);

  const quickViewActiveCombo = useMemo(() => {
    if (quickViewMode !== "paired" || !quickViewComboId) return null;
    if (quickViewComboId === "fit-combo") {
      return quickViewPiece?.variants?.find((v: any) => v.id === "fit-combo") || null;
    }
    return quickViewActiveVariant?.combos?.find((c: any) => c.id === quickViewComboId) || null;
  }, [quickViewMode, quickViewComboId, quickViewPiece, quickViewActiveVariant]);

  const quickViewGalleryImages = useMemo(() => {
    if (!quickViewPiece) return [];
    
    let imagesToUse = quickViewPiece.images || [];

    if (quickViewActiveCombo && quickViewActiveCombo.images && quickViewActiveCombo.images.length > 0) {
      imagesToUse = quickViewActiveCombo.images;
    } else if (quickViewActiveVariant && quickViewActiveVariant.id !== "main-color" && quickViewActiveVariant.images && quickViewActiveVariant.images.length > 0) {
      imagesToUse = quickViewActiveVariant.images;
    } else if (quickViewActiveVariant && quickViewActiveVariant.id !== "main-color" && quickViewActiveVariant.combos && quickViewActiveVariant.combos[0]?.images?.length > 0) {
      imagesToUse = quickViewActiveVariant.combos[0].images;
    }

    return imagesToUse.filter((img: string) => img && img.trim() !== "");
  }, [quickViewPiece, quickViewActiveVariant, quickViewActiveCombo]);

  useEffect(() => {
    if (quickViewGalleryImages.length > 0) {
      setActiveImage(quickViewGalleryImages[0]);
    }
  }, [quickViewGalleryImages]);

  return (
    <div className={styles.page}>
      <div
        className={`${PAGE_HERO_SHELL_CLASS} ${styles.pageHeader}`}
        data-page-hero-empty={shopHeroEmpty ? "true" : "false"}
        data-page-hero-loading={shopHeroSpinner ? "true" : "false"}
        data-page-hero-ready={shopHeroImageReady ? "true" : "false"}
        style={shopHeroStyle}
      >
        {shopHeroImageLoader ? <PageHeroShellImageLoader /> : null}
        <div className="container">
          <span className="section-label">The Shop</span>
          <h1 className={`t-display ${styles.pageTitle}`}>Shop</h1>
          <p className={styles.pageSubtext}>
            Every piece crafted with intention.
          </p>

          {/* Glassy search bar */}
          <div className={styles.searchBarWrap} ref={searchWrapRef}>
            <div className={styles.searchBar}>
              <svg
                className={styles.searchIcon}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                id="shop-search"
                type="text"
                className={styles.searchInput}
                placeholder="Find your signature look..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSearchFocused(false);
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                autoComplete="off"
                spellCheck={false}
              />
              {searchQuery && (
                <button
                  type="button"
                  className={styles.searchClear}
                  onClick={() => { setSearchQuery(""); setSearchFocused(false); }}
                  aria-label="Clear search"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {searchFocused && searchQuery.trim() && (
              <div className={styles.searchDropdown}>
                {searchResults.length > 0 ? (
                  searchResults.map((p: any) => (
                    <button
                      key={p.id}
                      type="button"
                      className={styles.searchResultItem}
                      onClick={() => {
                        setSearchFocused(false);
                        setSearchQuery("");
                        router.push(`/shop/${p.slug || p.id}`);
                      }}
                    >
                      <div className={styles.searchResultImageWrap}>
                        <ProductMedia
                          src={p.image}
                          alt={p.name}
                          className={styles.searchResultImage}
                        />
                      </div>
                      <div className={styles.searchResultInfo}>
                        <span className={styles.searchResultName}>{p.name}</span>
                        <span className={styles.searchResultMeta}>
                          {getCollectionName(p) || p.categoryName || ""}
                          {p.price ? ` · GHC ${p.price.toLocaleString()}` : ""}
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className={styles.searchNoResults}>
                    <span>No pieces found for &ldquo;{searchQuery.trim()}&rdquo;</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.collectionsSectionWrap}>
        <CollectionsSection headingId="shop-collections-heading" viewAllId="shop-collections-view-all" />
      </div>

      <div className={styles.wearFilterBar}>
        <div className={`container ${styles.wearFilterInner}`}>
          <span className={styles.wearFilterLabel} id="wear-filter-label">Shop by</span>
          <div className={styles.wearPills} role="group" aria-labelledby="wear-filter-label">
            {wearFilters.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`${styles.wearPill} ${wearFilter === f.id ? styles.wearPillActive : ""}`}
                onClick={() => setWearFilter(f.id)}
                aria-pressed={wearFilter === f.id}
              >
                {f.label}
              </button>
            ))}
            <button
              type="button"
              className={`${styles.wearPill} ${activePriceFilter ? styles.wearPillActive : ""}`}
              onClick={() => {
                if (activePriceFilter) {
                  setTempMinPrice(String(activePriceFilter[0]));
                  setTempMaxPrice(String(activePriceFilter[1]));
                }
                setPriceFilterOpen(true);
              }}
            >
              {activePriceFilter ? `GHC ${activePriceFilter[0]} - ${activePriceFilter[1]}` : "Price"}
            </button>
            {activePriceFilter && (
              <button
                type="button"
                className={styles.clearFilterBtn}
                onClick={() => setActivePriceFilter(null)}
                aria-label="Clear price filter"
              >
                &times;
              </button>
            )}
          </div>
        </div>
      </div>

      <div id="shop-pieces" className={`section ${styles.productsSection}`}>
        <div className="container">
          {isStoreLoading ? (
            <ShopProductsSkeleton count={6} />
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              {products.length === 0 ? (
                <p>Our shop is currently being updated. Please check back soon for new pieces.</p>
              ) : (
                <p>No pieces match these filters yet. Try another collection or wear filter.</p>
              )}
            </div>
          ) : (
            <div className={styles.grid}>
              {filtered.map((p: any) => {
                const colorVariants = (p.variants || []).filter((v: any) => v.type === "color");
                const hasColors = colorVariants.length > 0;
                const swatchesToShow = colorVariants.slice(0, 3);
                const totalColors = colorVariants.length;

                return (
                  <article key={p.id} className={styles.card}>
                    <div className={styles.imageWrapOuter}>
                      <div className={styles.imageWrap}>
                        {p.hoverImage ? (
                          <>
                            <ProductMedia src={p.image} alt={p.name} className={styles.imagePrimary} loading="lazy" />
                            <ProductMedia src={p.hoverImage} alt="" className={styles.imageHover} loading="lazy" aria-hidden="true" />
                          </>
                        ) : (
                          <ProductMedia src={p.image} alt={p.name} className={styles.image} loading="lazy" />
                        )}

                        {hasColors && (
                          <div className={styles.colorIndicatorWrap} aria-label={`${totalColors} colors available`}>
                            {swatchesToShow.map((v: any) => (
                              <div
                                key={v.id}
                                className={styles.colorSwatch}
                                style={{ backgroundColor: v.colorHex || "#ccc", backgroundImage: (v.thumbnailUrl || (v.images && v.images[0]) || (v.id === "main-color" ? p.image : null) || (v.combos && v.combos[0]?.thumbnailUrl) || (v.combos && v.combos[0]?.images?.[0]) || null) ? `url(${v.thumbnailUrl || (v.images && v.images[0]) || (v.id === "main-color" ? p.image : null) || (v.combos && v.combos[0]?.thumbnailUrl) || (v.combos && v.combos[0]?.images?.[0]) || ""})` : "none", backgroundSize: "cover", backgroundPosition: "center" }}
                                aria-hidden="true"
                              />
                            ))}
                            {totalColors > 3 && (
                              <span className={styles.colorCount}>3+</span>
                            )}
                          </div>
                        )}

                        <div className={styles.overlay}>
                          <div className={styles.actionButtons}>
                        <button
                          className={styles.iconBtn}
                          aria-label="Add to Wishlist"
                          title="Add to Wishlist"
                          onClick={() => toggleWishlist(p)}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill={isInWishlist(p.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" suppressHydrationWarning>
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                          </svg>
                        </button>
                        <button
                          className={styles.iconBtn}
                          aria-label="Quick View"
                          title="Quick View"
                          onClick={() => setQuickViewPiece(p)}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="6" cy="15" r="4"/><circle cx="18" cy="15" r="4"/><path d="M14 15a2 2 0 0 0-2-2 2 2 0 0 0-2 2"/><path d="M2.5 13 5 7c.7-1.3 1.4-2 3-2"/><path d="M21.5 13 19 7c-.7-1.3-1.5-2-3-2"/>
                          </svg>
                        </button>
                        </div>

                        <div className={styles.pickMeWrap}>
                          {(() => {
                            const isBespoke = !!(p.bespokeAvailable && p.quantity <= 0);
                            return isBespoke ? (
                              <Link
                                href={`/shop/${p.slug || p.id}`}
                                className={styles.pickMeBtn}
                                aria-label={`View ${p.name}`}
                              >
                                Bespoke
                              </Link>
                            ) : p.isOutOfStock ? (
                              <span className={`${styles.pickMeBtn} ${styles.soldOutBtn}`}>
                                Sold Out
                              </span>
                            ) : (
                              <Link
                                href={`/shop/${p.slug || p.id}`}
                                className={styles.pickMeBtn}
                                aria-label={`View ${p.name}`}
                              >
                                Pick Me
                              </Link>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    <div className={styles.badgeStack} aria-hidden="true">
                      {(() => {
                        const isBespoke = !!(p.bespokeAvailable && p.quantity <= 0);
                        return isBespoke ? (
                          <span className={styles.saleBadge} style={{ background: "#8b5cf6" }}>BESPOKE ORDER</span>
                        ) : p.isOutOfStock ? (
                          <span className={styles.saleBadge} style={{ background: "#ef4444" }}>OUT OF STOCK</span>
                        ) : (
                          <>
                            {p.category === "sample-sale" && (
                              <span className={styles.saleBadge}>SALE</span>
                            )}
                            {p.isLimited && p.category !== "sample-sale" && (
                              <span className={styles.saleBadge} style={{ background: "#8b5cf6" }}>LIMITED</span>
                            )}
                            {p.isBestSeller && (
                              <span className={styles.saleBadge} style={{ background: "#f59e0b" }}>BEST SELLER</span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div className={styles.info}>
                    <span className={styles.category}>
                      {(() => {
                        const colName = getCollectionName(p);
                        return colName ? colName : null;
                      })()}
                    </span>
                    <h2 className={styles.name} style={{ fontSize: p.name.length > 24 ? "0.95rem" : p.name.length > 16 ? "1.1rem" : undefined }}>{p.name}</h2>
                    <div className={styles.priceRow}>
                      <span className={styles.price}>{formatPrice(p.price)}</span>
                      {p.originalPrice && (
                        <span className={styles.originalPrice}>{formatPrice(p.originalPrice)}</span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
            </div>
          )}
        </div>
      </div>

      {quickViewPiece && (
        <div className={styles.modalBackdrop} onClick={() => setQuickViewPiece(null)} aria-hidden="true">
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <button className={styles.modalClose} onClick={() => setQuickViewPiece(null)} aria-label="Close modal">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <div className={styles.modalGrid}>
              {(() => {
                const quickViewStockStatus = getVariantStockStatus(quickViewPiece, quickViewActiveVariant, quickViewActiveCombo, quickViewMode);
                return (
                  <>
              <div className={styles.modalGallery}>
                <div className={styles.modalImageWrap} style={{ position: "relative" }}>
                  <ProductMedia src={activeImage || quickViewGalleryImages[0] || quickViewPiece.image} alt={quickViewPiece.name} className={styles.modalImage} />
                  <div className={styles.badgeStack} aria-hidden="true" style={{ left: "var(--space-md)" }}>
                    {(() => {
                      const isBespoke = quickViewStockStatus.isBespokeProduct;
                      return isBespoke ? (
                        <span className={styles.saleBadge} style={{ background: "#8b5cf6" }}>BESPOKE ORDER</span>
                      ) : quickViewStockStatus.isSelectedOutOfStock ? (
                        <span className={styles.saleBadge} style={{ background: "#ef4444" }}>OUT OF STOCK</span>
                      ) : (
                        <>
                          {quickViewPiece.category === "sample-sale" && (
                            <span className={styles.saleBadge}>SALE</span>
                          )}
                          {quickViewPiece.isLimited && quickViewPiece.category !== "sample-sale" && (
                            <span className={styles.saleBadge} style={{ background: "#8b5cf6" }}>LIMITED</span>
                          )}
                          {quickViewPiece.isBestSeller && (
                            <span className={styles.saleBadge} style={{ background: "#f59e0b" }}>BEST SELLER</span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
                {quickViewGalleryImages && quickViewGalleryImages.length > 1 && (
                  <div className={styles.modalThumbnails}>
                    {quickViewGalleryImages.map((img: string, idx: number) => (
                      <button
                        key={idx}
                        className={`${styles.thumbBtn} ${(activeImage || quickViewGalleryImages[0]) === img ? styles.thumbActive : ""}`}
                        onClick={() => setActiveImage(img)}
                        aria-label={`View image ${idx + 1}`}
                      >
                        <ProductMedia src={img} alt={`Thumbnail ${idx + 1}`} className={styles.thumbImage} />
                      </button>
                    ))}
                  </div>
                )}
                {quickViewPiece?.variants?.some((v: any) => v.id === "fit-combo") && quickViewColorVariants.length === 0 && (
                  <div className={styles.comboSelectorSection} style={{ marginTop: "1rem" }}>
                    <span className={styles.colorSelectorLabel} style={{ display: "block", marginBottom: "0.5rem" }}>Fit Combo:</span>
                    <div className={styles.comboToggles} style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem" }}>
                      <button
                        type="button"
                        onClick={() => { setQuickViewMode("solo"); setQuickViewComboId(""); }}
                        style={{ 
                          padding: "0.25rem 0", 
                          borderBottom: quickViewMode === "solo" ? "2px solid #000" : "2px solid transparent",
                          color: quickViewMode === "solo" ? "#000" : "#888",
                          fontWeight: quickViewMode === "solo" ? 600 : 400,
                          background: "none", borderTop: "none", borderLeft: "none", borderRight: "none", cursor: "pointer"
                        }}
                      >
                        Original
                      </button>
                      <button
                        type="button"
                        onClick={() => { setQuickViewMode("paired"); setQuickViewComboId("fit-combo"); }}
                        style={{ 
                          padding: "0.25rem 0", 
                          borderBottom: quickViewMode === "paired" ? "2px solid #000" : "2px solid transparent",
                          color: quickViewMode === "paired" ? "#000" : "#888",
                          fontWeight: quickViewMode === "paired" ? 600 : 400,
                          background: "none", borderTop: "none", borderLeft: "none", borderRight: "none", cursor: "pointer"
                        }}
                      >
                        Options
                      </button>
                    </div>

                    {quickViewMode === "paired" && (
                      <div className={styles.comboThumbnails} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <button
                          onClick={() => setQuickViewComboId("fit-combo")}
                          style={{
                            width: "48px", height: "48px", borderRadius: "4px", overflow: "hidden",
                            border: quickViewComboId === "fit-combo" ? "2px solid #000" : "1px solid #e5e5e5",
                            padding: 0, background: "none", cursor: "pointer", position: "relative"
                          }}
                          title={quickViewPiece.variants?.find((v: any) => v.id === "fit-combo")?.name || "Fit Combo"}
                        >
                          {quickViewPiece.variants?.find((v: any) => v.id === "fit-combo")?.thumbnailUrl ? (
                            <img src={quickViewPiece.variants?.find((v: any) => v.id === "fit-combo")?.thumbnailUrl} alt="Thumbnail" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>
                              {(quickViewPiece.variants?.find((v: any) => v.id === "fit-combo")?.name || "Fit Combo").slice(0, 2)}
                            </div>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {quickViewColorVariants.length > 0 && (
                  <>
                    <div className={styles.colorSelectorSection}>
                      <span className={styles.colorSelectorLabel}>Color:</span>
                      <div className={styles.colorSelectorSwatches}>
                        {quickViewColorVariants.map((v: any) => (
                          <button
                            key={v.id}
                            className={`${styles.colorSelectorBtn} ${quickViewColorVariantId === v.id ? styles.colorSelectorBtnActive : ""}`}
                            style={{ backgroundColor: v.colorHex || "#ccc", backgroundImage: (v.thumbnailUrl || (v.images && v.images[0]) || (v.id === "main-color" ? quickViewPiece.image : null) || (v.combos && v.combos[0]?.thumbnailUrl) || (v.combos && v.combos[0]?.images?.[0]) || null) ? `url(${v.thumbnailUrl || (v.images && v.images[0]) || (v.id === "main-color" ? quickViewPiece.image : null) || (v.combos && v.combos[0]?.thumbnailUrl) || (v.combos && v.combos[0]?.images?.[0]) || ""})` : "none", backgroundSize: "cover", backgroundPosition: "center" }}
                            onClick={() => {
                              setQuickViewColorVariantId(v.id);
                              const isSoloUnavailable = getIsSoloUnavailable(v, quickViewPiece);
                              const hasCombos = v.combos && v.combos.length > 0;
                              if (isSoloUnavailable && hasCombos) {
                                setQuickViewMode("paired");
                                setQuickViewComboId(v.combos[0].id);
                              } else if (quickViewMode === "paired" && hasCombos) {
                                setQuickViewComboId(v.combos[0].id);
                              } else if (!hasCombos) {
                                setQuickViewMode("solo");
                                setQuickViewComboId("");
                              }
                            }}
                            aria-label={`Select color ${v.colorHex}`}
                            title={v.name || "Color"}
                          />
                        ))}
                      </div>
                    </div>

                    {quickViewActiveVariant && quickViewActiveVariant.combos && quickViewActiveVariant.combos.length > 0 && (
                      <div className={styles.comboSelectorSection} style={{ marginTop: "1rem" }}>
                        <span className={styles.colorSelectorLabel} style={{ display: "block", marginBottom: "0.5rem" }}>Fit Combo:</span>
                        <div className={styles.comboToggles} style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem" }}>
                          <button
                            type="button"
                            onClick={() => { setQuickViewMode("solo"); setQuickViewComboId(""); }}
                            style={{ 
                              padding: "0.25rem 0", 
                              borderBottom: quickViewMode === "solo" ? "2px solid #000" : "2px solid transparent",
                              color: quickViewMode === "solo" ? "#000" : "#888",
                              fontWeight: quickViewMode === "solo" ? 600 : 400,
                              background: "none", borderTop: "none", borderLeft: "none", borderRight: "none", cursor: "pointer"
                            }}
                          >
                        Original
                      </button>
                          <button
                            type="button"
                            onClick={() => { setQuickViewMode("paired"); setQuickViewComboId(quickViewActiveVariant?.combos?.[0]?.id || ""); }}
                            style={{ 
                              padding: "0.25rem 0", 
                              borderBottom: quickViewMode === "paired" ? "2px solid #000" : "2px solid transparent",
                              color: quickViewMode === "paired" ? "#000" : "#888",
                              fontWeight: quickViewMode === "paired" ? 600 : 400,
                              background: "none", borderTop: "none", borderLeft: "none", borderRight: "none", cursor: "pointer"
                            }}
                          >
                        Options
                      </button>
                        </div>
                        
                        {quickViewMode === "paired" && (
                          <div className={styles.comboThumbnails} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            {quickViewActiveVariant.combos?.map((combo: any) => (
                              <button
                                key={combo.id}
                                onClick={() => setQuickViewComboId(combo.id)}
                                style={{
                                  width: "48px", height: "48px", borderRadius: "4px", overflow: "hidden",
                                  border: quickViewComboId === combo.id ? "2px solid #000" : "1px solid #e5e5e5",
                                  padding: 0, background: "none", cursor: "pointer", position: "relative"
                                }}
                                title={combo.name}
                              >
                                {combo.thumbnailUrl ? (
                                  <img src={combo.thumbnailUrl} alt={combo.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                  <div style={{ width: "100%", height: "100%", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>{combo.name.slice(0, 2)}</div>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className={styles.modalInfo}>
                <h2 id="modal-title" className={`t-display ${styles.modalTitle}`}>
                  {quickViewActiveCombo?.productNameOverride ? quickViewActiveCombo.productNameOverride : (quickViewActiveVariant && quickViewActiveVariant.id !== "main-color" && quickViewActiveVariant.productNameOverride ? quickViewActiveVariant.productNameOverride : quickViewPiece.name)}
                </h2>
                <div className={styles.modalPriceRow}>
                  <span className={styles.modalPrice}>
                    {formatPrice(quickViewActiveCombo ? (quickViewActiveCombo.price || quickViewPiece.price) : quickViewPiece.price)}
                  </span>
                  {!quickViewActiveCombo && quickViewPiece.originalPrice && <span className={styles.modalOriginalPrice}>{formatPrice(quickViewPiece.originalPrice)}</span>}
                </div>

                <p className={styles.modalDesc}>{quickViewPiece.description}</p>

                {(quickViewPiece.wearTag === "womens" || quickViewPiece.wearTag === "unisex") && (
                  <div className={styles.modalSizeRow} style={{ marginBottom: "1rem" }}>
                    <span className={styles.qtyLabel}>{quickViewPiece.wearTag === "unisex" ? "Gender:" : "Fit:"}</span>
                    <div className={styles.modalFitSelector}>
                      {(quickViewPiece.wearTag === "unisex" ? ["Men", "Women"] : ["Standard", "Thick"]).map((fit) => (
                        <button
                          key={fit}
                          className={`${styles.fitBtn} ${quickViewFit === fit ? styles.fitBtnActive : ""}`}
                          onClick={() => { setQuickViewFit(fit); setSelectedSize(""); }}
                        >
                          {fit}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className={styles.modalSizeRow}>
                  <span className={styles.qtyLabel}>Size:</span>
                  <div className={styles.sizeGrid}>
                    {getAvailableSizes(quickViewPiece, quickViewFit).map((sz: string) => (
                      <button
                        key={sz}
                        className={`${styles.sizeBtn} ${selectedSize === sz ? styles.sizeActive : ""}`}
                        onClick={() => setSelectedSize(prev => prev === sz ? "" : sz)}
                      >
                        {formatSizeLabel(sz, quickViewFit, quickViewPiece.wearTag)}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={styles.sizeGuideBtn}
                    onClick={() => setSizeGuideOpen(true)}
                  >
                    Size Guide
                  </button>
                </div>
                {selectedSize === "Custom" && (
                  <p className={styles.customNotice}>
                    Custom sizing selected. We will contact you for measurements after checkout.
                  </p>
                )}

                {(() => {
                  const isBespoke = quickViewStockStatus.isBespokeProduct;
                  return isBespoke ? (
                    <p className={styles.customNotice} style={{ color: "#5b21b6", background: "#f5f3ff" }}>
                      🧵 Bespoke order. Expect ~{quickViewStockStatus.bespokeLeadDays || 14} days for production.
                    </p>
                  ) : quickViewPiece.isOutOfStock ? (
                    <p className={styles.customNotice} style={{ color: "#c00", background: "#fee" }}>
                      This item is currently out of stock.
                    </p>
                  ) : null;
                })()}

                <div className={styles.modalQtyRow}>
                  <div className={styles.qtyLeft}>
                    <span className={styles.qtyLabel}>Quantity:</span>
                    <div className={styles.qtyControl}>
                      <button className={styles.qtyBtn} onClick={() => setQty(Math.max(1, qty - 1))}>-</button>
                      <span className={styles.qtyVal}>{qty}</span>
                      <button 
                        className={styles.qtyBtn} 
                        onClick={() => {
                          const isBespoke = quickViewStockStatus.isBespokeProduct;
                          if (isBespoke || qty < quickViewStockStatus.maxStock) {
                            setQty(qty + 1);
                          } else {
                            toast.error(`Only ${quickViewStockStatus.maxStock} items available.`);
                          }
                        }}
                        disabled={!quickViewStockStatus.isBespokeProduct && qty >= quickViewStockStatus.maxStock}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {quickViewPiece.quantity > 0 && quickViewPiece.quantity < 6 && (
                    <span className={styles.lowStockWarning}>Only {quickViewPiece.quantity} left</span>
                  )}
                </div>

                <div className={styles.modalActions}>
                  {(() => {
                    const isBespoke = quickViewStockStatus.isBespokeProduct;
                    return (
                      <button
                        className={`btn btn-primary ${styles.modalAddBtn}`}
                        onClick={handleAddToCart}
                        disabled={(quickViewStockStatus.isSelectedOutOfStock && !isBespoke) || addStatus !== "idle"}
                        style={{ transition: "all 0.3s ease" }}
                      >
                        {quickViewStockStatus.isSelectedOutOfStock && !isBespoke
                          ? "Out of Stock"
                          : isBespoke
                            ? (addStatus === "idle" ? "Order Bespoke" : addStatus === "adding" ? "Adding..." : "Added ✓")
                            : (addStatus === "idle" ? "Add To Cart" : addStatus === "adding" ? "Adding..." : "Added ✓")}
                      </button>
                    );
                  })()}
                  <button
                    className={styles.modalWishlistBtn}
                    onClick={() => toggleWishlist(quickViewPiece)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={isInWishlist(quickViewPiece.id) ? "var(--alaska-gray)" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" suppressHydrationWarning>
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    {isInWishlist(quickViewPiece.id) ? "Saved to wishlist" : "Add to wishlist"}
                  </button>
                </div>

                {(() => {
                  const isBespoke = quickViewStockStatus.isBespokeProduct;
                  return isBespoke ? (
                    <div role="status" aria-live="polite" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "10px", marginTop: "16px", marginBottom: "2px", fontSize: "0.95rem", color: "rgba(20, 20, 20, 0.78)", background: "#f5f3ff", borderColor: "#c4b5fd", padding: "8px", borderRadius: "6px" }}>
                      <Clock aria-hidden style={{ flex: "0 0 auto", opacity: 0.85, width: "18px", height: "18px", color: "#7c3aed" }} />
                      <span style={{ color: "#5b21b6" }}>
                        bespoke piece would be handcrafted for you within {quickViewStockStatus.bespokeLeadDays || 14} days
                      </span>
                    </div>
                  ) : null;
                })()}

                <div className={styles.modalMeta}>
                  {(() => {
                    const colName = getCollectionName(quickViewPiece);
                    return colName ? <p><span>Collection:</span> {colName}</p> : null;
                  })()}
                </div>
                <Link href={`/shop/${quickViewPiece.slug || quickViewPiece.id}`} className={styles.modalFullDetail}>
                  View Full Details →
                </Link>
              </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <SizeGuideModal open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} kind={sizeGuideKind} />

      {priceFilterOpen && typeof document !== "undefined" && createPortal(
        <div className={styles.modalBackdrop} onClick={() => setPriceFilterOpen(false)} aria-hidden="true">
          <div className={styles.priceModalContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="price-modal-title">
            <button className={styles.modalClose} onClick={() => setPriceFilterOpen(false)} aria-label="Close price filter">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <h3 id="price-modal-title" className={styles.priceModalTitle}>Filter by Price</h3>
            <div className={styles.priceInputsWrap}>
              <div className={styles.priceInputGroup}>
                <label>Min (GHC)</label>
                <input
                  type="number"
                  value={tempMinPrice}
                  onChange={(e) => setTempMinPrice(e.target.value)}
                  className={styles.priceInput}
                  min="0"
                />
              </div>
              <span className={styles.priceSeparator}>-</span>
              <div className={styles.priceInputGroup}>
                <label>Max (GHC)</label>
                <input
                  type="number"
                  value={tempMaxPrice}
                  onChange={(e) => setTempMaxPrice(e.target.value)}
                  className={styles.priceInput}
                  min="0"
                />
              </div>
            </div>
            <div className={styles.priceModalActions}>
              <button
                className={`btn btn-secondary ${styles.priceClearBtn}`}
                onClick={() => {
                  setActivePriceFilter(null);
                  setPriceFilterOpen(false);
                }}
              >
                Clear
              </button>
              <button
                className={`btn btn-primary ${styles.priceApplyBtn}`}
                onClick={() => {
                  const min = parseInt(tempMinPrice, 10) || 0;
                  const max = parseInt(tempMaxPrice, 10) || 0;
                  if (max >= min) {
                    setActivePriceFilter([min, max]);
                  }
                  setPriceFilterOpen(false);
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
