"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useSyncExternalStore, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import styles from "./ShopClient.module.css";
import CollectionsSection from "@/components/home/CollectionsSection";
import { wishlistStore } from "@/store/wishlistStore";
import { dataStore, DEFAULT_SIZES } from "@/lib/dataStore";
import { useStoreLoading } from "@/hooks/useStoreLoading";
import PageHeroShellImageLoader from "@/components/page-hero/PageHeroShellImageLoader";
import { PAGE_HERO_SHELL_CLASS, usePageHeroShellRenderProps } from "@/hooks/usePageHero";
import ProductMedia from "@/components/shop/ProductMedia";
import SizeGuideModal, { type SizeGuideKind } from "@/components/SizeGuideModal";


type WearFilter = "all" | "mens" | "womens";

const EMPTY_ARRAY: any[] = [];
const EMPTY_COLLECTIONS: any[] = [];
const _getEmptyArray = () => EMPTY_ARRAY;
const _getProducts = () => dataStore.getProducts();
const _getWishlistItems = () => wishlistStore.getItems();
const _getCollections = () => dataStore.getCollections();
const _getEmptyCollections = () => EMPTY_COLLECTIONS;

function formatSizeLabel(raw: string): string {
  const s = String(raw || "").trim();
  const m = /^UK(\d+)\s*\/\s*US(\d+)$/i.exec(s);
  if (m) return `UK ${m[1]} / US ${m[2]}`;
  return s;
}

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
  const [selectedCollectionSlug, setSelectedCollectionSlug] = useState<string | null>(null);
  const [wearFilter, setWearFilter] = useState<WearFilter>("all");
  const [quickViewPiece, setQuickViewPiece] = useState<any>(null);
  const [activeImage, setActiveImage] = useState<string>("");
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState("");
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
        cartStore.addItem({
          productId: quickViewPiece.id,
          name: quickViewPiece.name,
          size: selectedSize || "Standard",
          price: quickViewPiece.price,
          image: quickViewPiece.image,
          quantity: qty,
          maxStock: quickViewPiece.quantity,
        });

        setAddStatus("added");
        setTimeout(() => setAddStatus("idle"), 2000);
      });
    }, 400);
  };

  const getAvailableSizes = (prod: any) => {
    if (!prod?.sizes || prod.sizes.length < 6) {
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
    return list;
  }, [products, selectedCollectionSlug, wearFilter]);

  const formatPrice = (price: number) => `GHC ${price.toLocaleString()}`;
  const {
    empty: shopHeroEmpty,
    shellSpinner: shopHeroSpinner,
    style: shopHeroStyle,
    showImageLoader: shopHeroImageLoader,
  } = usePageHeroShellRenderProps("shop");

  return (
    <div className={styles.page}>
      <div
        className={`${PAGE_HERO_SHELL_CLASS} ${styles.pageHeader}`}
        data-page-hero-empty={shopHeroEmpty ? "true" : "false"}
        data-page-hero-loading={shopHeroSpinner ? "true" : "false"}
        style={shopHeroStyle}
      >
        {shopHeroImageLoader ? <PageHeroShellImageLoader /> : null}
        <div className="container">
          <span className="section-label">The Shop</span>
          <h1 className={`t-display ${styles.pageTitle}`}>Shop</h1>
          <p className={styles.pageSubtext}>
            Every piece crafted with intention.
          </p>
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
          </div>
        </div>
      </div>

      <div id="shop-pieces" className={`section ${styles.productsSection}`}>
        <div className="container">
          {isStoreLoading ? (
            <ShopProductsSkeleton count={6} />
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              <p>No pieces match these filters yet. Try another collection or wear filter.</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {filtered.map((p: any) => (
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
                          {p.isOutOfStock ? (
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
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={styles.badgeStack} aria-hidden="true">
                      {p.isOutOfStock ? (
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
                      )}
                    </div>
                  </div>
                  <div className={styles.info}>
                    <span className={styles.category}>
                      {(() => {
                        const colName = getCollectionName(p);
                        return colName ? colName : null;
                      })()}
                    </span>
                    <h2 className={styles.name}>{p.name}</h2>
                    <div className={styles.priceRow}>
                      <span className={styles.price}>{formatPrice(p.price)}</span>
                      {p.originalPrice && (
                        <span className={styles.originalPrice}>{formatPrice(p.originalPrice)}</span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
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
              <div className={styles.modalGallery}>
                <div className={styles.modalImageWrap}>
                  <ProductMedia src={activeImage || quickViewPiece.image} alt={quickViewPiece.name} className={styles.modalImage} />
                </div>
                {quickViewPiece.images && quickViewPiece.images.length > 1 && (
                  <div className={styles.modalThumbnails}>
                    {quickViewPiece.images.map((img: string, idx: number) => (
                      <button
                        key={idx}
                        className={`${styles.thumbBtn} ${(activeImage || quickViewPiece.image) === img ? styles.thumbActive : ""}`}
                        onClick={() => setActiveImage(img)}
                        aria-label={`View image ${idx + 1}`}
                      >
                        <ProductMedia src={img} alt={`Thumbnail ${idx + 1}`} className={styles.thumbImage} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.modalInfo}>
                <h2 id="modal-title" className={`t-display ${styles.modalTitle}`}>{quickViewPiece.name}</h2>
                <div className={styles.modalPriceRow}>
                  <span className={styles.modalPrice}>{formatPrice(quickViewPiece.price)}</span>
                  {quickViewPiece.originalPrice && <span className={styles.modalOriginalPrice}>{formatPrice(quickViewPiece.originalPrice)}</span>}
                </div>

                <p className={styles.modalDesc}>{quickViewPiece.description}</p>

                <div className={styles.modalSizeRow}>
                  <span className={styles.qtyLabel}>Size:</span>
                  <div className={styles.sizeGrid}>
                    {getAvailableSizes(quickViewPiece).map((sz: string) => (
                      <button
                        key={sz}
                        className={`${styles.sizeBtn} ${selectedSize === sz ? styles.sizeActive : ""}`}
                        onClick={() => setSelectedSize(prev => prev === sz ? "" : sz)}
                      >
                        {formatSizeLabel(sz)}
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

                {quickViewPiece.isOutOfStock && (
                  <p className={styles.customNotice} style={{ color: "#c00", background: "#fee" }}>
                    This item is currently out of stock.
                  </p>
                )}

                <div className={styles.modalQtyRow}>
                  <div className={styles.qtyLeft}>
                    <span className={styles.qtyLabel}>Quantity:</span>
                    <div className={styles.qtyControl}>
                      <button className={styles.qtyBtn} onClick={() => setQty(Math.max(1, qty - 1))}>-</button>
                      <span className={styles.qtyVal}>{qty}</span>
                      <button 
                        className={styles.qtyBtn} 
                        onClick={() => {
                          if (qty < quickViewPiece.quantity) {
                            setQty(qty + 1);
                          } else {
                            toast.error(`Only ${quickViewPiece.quantity} items available.`);
                          }
                        }}
                        disabled={qty >= quickViewPiece.quantity}
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
                  <button
                    className={`btn btn-primary ${styles.modalAddBtn}`}
                    onClick={handleAddToCart}
                    disabled={addStatus !== "idle" || quickViewPiece.isOutOfStock}
                    style={{ transition: "all 0.3s ease" }}
                  >
                    {quickViewPiece.isOutOfStock ? "Out of Stock" : addStatus === "idle" ? "Add To Cart" : addStatus === "adding" ? "Adding..." : "Added 👍"}
                  </button>
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
            </div>
          </div>
        </div>
      )}

      <SizeGuideModal open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} kind={sizeGuideKind} />
    </div>
  );
}
