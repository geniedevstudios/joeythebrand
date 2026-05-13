"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { useEffect, useMemo, useSyncExternalStore, useState } from "react";
import { createPortal } from "react-dom";
import { dataStore } from "@/lib/dataStore";
import { wishlistStore } from "@/store/wishlistStore";
import { DEFAULT_SIZES, WOMENS_DEFAULT_SIZES } from "@/lib/dataStore";
import { useStoreLoading } from "@/hooks/useStoreLoading";
import type { Product } from "@/lib/types";
import type { WishlistItem } from "@/store/wishlistStore";
import ProductMedia from "@/components/shop/ProductMedia";
import styles from "./FeaturedSection.module.css";

const EMPTY_PRODUCTS: Product[] = [];
const EMPTY_WISHLIST: WishlistItem[] = [];
const EMPTY_COLLECTIONS: any[] = [];

function formatSizeLabel(raw: string, fit?: string, wearTag?: string): string {
  const s = String(raw || "").trim();
  
  // For women's Standard fit, map alpha sizes to UK/US numeric labels
  if (fit === "Standard" && wearTag === "womens") {
    if (s === "XS") return "UK 6 / US 2";
    if (s === "S") return "UK 8 / US 4";
    if (s === "M") return "UK 10 / US 6";
    if (s === "L") return "UK 12 / US 8";
    if (s === "XL") return "UK 14 / US 10";
    if (s === "XXL") return "UK 16 / US 12";
  }

  const m = /^UK(\d+)\s*\/\s*US(\d+)$/i.exec(s);
  if (m) return `UK ${m[1]} / US ${m[2]}`;
  return s;
}

function FeaturedSectionSkeleton() {
  return (
    <section className={`section ${styles.featured}`} id="featured" aria-busy="true">
      <div className="container">
        <div className={styles.header}>
          <div>
            <span className="section-label">Crafted with intention</span>
            <h2 className={`t-heading ${styles.heading}`}>Pieces that speak first.</h2>
          </div>
          <Link href="/shop" className={`btn btn-outline ${styles.viewAll}`} id="featured-view-all">
            Shop for more
          </Link>
        </div>
        <div className={styles.grid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <article key={i} className={styles.card}>
              <div className={styles.imageWrapOuter}>
                <div
                  className="skeleton"
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "inherit",
                  }}
                />
              </div>
              <div className={styles.info}>
                <div className="skeleton" style={{ height: 12, width: "40%", marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 20, width: "75%" }} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function FeaturedSection() {
  const isStoreLoading = useStoreLoading();
  const products = useSyncExternalStore(dataStore.subscribe, dataStore.getProducts, () => EMPTY_PRODUCTS);
  const collections = useSyncExternalStore(dataStore.subscribe, dataStore.getCollections, () => EMPTY_COLLECTIONS);
  const wishlistItems = useSyncExternalStore(wishlistStore.subscribe, wishlistStore.getItems, () => EMPTY_WISHLIST);
  const [quickViewPiece, setQuickViewPiece] = useState<Product | null>(null);
  const [activeImage, setActiveImage] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedFit, setSelectedFit] = useState("Standard");
  const [addStatus, setAddStatus] = useState<"idle" | "adding" | "added">("idle");

  const getCollectionName = useMemo(() => {
    return (p: any): string => {
      const slug = String(p?.category || "").trim();
      if (!slug || slug === "none") return "";
      const match = (collections as any[]).find((c: any) => c?.slug === slug);
      return match?.name ? String(match.name) : "";
    };
  }, [collections]);

  const featuredLabel = useMemo(() => {
    const phrases = [
      "Made with love",
      "Made with you in mind",
      "Crafted with intention",
      "Woven with purpose",
      "Designed to be remembered",
      "Tailored for presence",
      "Built for the moment",
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }, []);
  
  // Filter for featured products (max 5 for the home grid)
  const featured = products.filter(p => p.featured).slice(0, 5);

  useEffect(() => {
    if (quickViewPiece) {
      document.body.style.overflow = "hidden";
      setActiveImage("");
      setQty(1);
      setSelectedSize("");
      setSelectedFit("Standard");
      setAddStatus("idle");
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [quickViewPiece]);

  if (isStoreLoading && featured.length === 0) {
    return <FeaturedSectionSkeleton />;
  }
  if (!isStoreLoading && featured.length === 0) {
    return null;
  }

  const isInWishlist = (id: string) => wishlistItems.some((item) => item.id === id);
  const toggleWishlist = (product: Product) => {
    wishlistStore.toggleItem({
      id: product.id,
      name: product.name,
      price: String(product.price),
      image: product.image,
      hoverImage: product.hoverImage,
      category: product.categoryName,
    });
  };

  const getAvailableSizes = (prod: Product, fit?: string) => {
    // For women's apparel, the range depends on the fit.
    if (prod?.wearTag === "womens") {
      if (fit === "Thick") {
        return ["S", "M", "L", "XL", "Custom"];
      }
      return WOMENS_DEFAULT_SIZES.map(s => s.name);
    }

    if (!prod?.sizes || prod.sizes.length === 0) {
      return DEFAULT_SIZES.map((s) => s.name);
    }
    return prod.sizes.filter((s) => s.available).map((s) => s.name);
  };

  const handleAddToCart = () => {
    if (!quickViewPiece) return;
    if (!selectedSize) return;

    setAddStatus("adding");
    setTimeout(() => {
      import("@/store/cartStore").then(({ cartStore }) => {
        cartStore.addItem({
          productId: quickViewPiece.id,
          name: quickViewPiece.name,
          size: selectedSize || "Standard",
          fit: quickViewPiece.wearTag === "womens" ? selectedFit : undefined,
          wearTag: quickViewPiece.wearTag,
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

  const modal =
    quickViewPiece && typeof document !== "undefined"
      ? createPortal(
          <div
            className={styles.modalBackdrop}
            onClick={() => setQuickViewPiece(null)}
            aria-hidden="true"
          >
            <div
              className={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="featured-quickview-title"
            >
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setQuickViewPiece(null)}
                aria-label="Close modal"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>

              <div className={styles.modalGrid}>
                <div className={styles.modalGallery}>
                  <div className={styles.modalImageWrap}>
                    <ProductMedia
                      src={activeImage || quickViewPiece.image}
                      alt={quickViewPiece.name}
                      className={styles.modalImage}
                    />
                  </div>

                  {quickViewPiece.images && quickViewPiece.images.length > 1 && (
                    <div className={styles.modalThumbnails}>
                      {quickViewPiece.images.map((img: string, idx: number) => (
                        <button
                          key={idx}
                          className={`${styles.thumbBtn} ${(activeImage || quickViewPiece.image) === img ? styles.thumbActive : ""}`}
                          onClick={() => setActiveImage(img)}
                          aria-label={`View image ${idx + 1}`}
                          type="button"
                        >
                          <ProductMedia src={img} alt={`Thumbnail ${idx + 1}`} className={styles.thumbImage} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.modalInfo}>
                  {(() => {
                    const colName = getCollectionName(quickViewPiece);
                    return colName ? <p className={styles.modalCategory}>{colName}</p> : null;
                  })()}
                  <h3 id="featured-quickview-title" className={styles.modalTitle}>{quickViewPiece.name}</h3>
                  <p className={styles.modalPrice}>GHC {Number(quickViewPiece.price).toLocaleString()}</p>

                  {quickViewPiece.description ? (
                    <p className={styles.modalDesc}>{quickViewPiece.description}</p>
                  ) : null}

                  {quickViewPiece.wearTag === "womens" && (
                    <div className={styles.modalSizeRow} style={{ marginBottom: "1rem" }}>
                      <span className={styles.qtyLabel}>Fit:</span>
                      <div className={styles.modalFitSelector}>
                        {["Standard", "Thick"].map((fit) => (
                          <button
                            key={fit}
                            type="button"
                            className={`${styles.fitBtn} ${selectedFit === fit ? styles.fitBtnActive : ""}`}
                            onClick={() => setSelectedFit(fit)}
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
                      {getAvailableSizes(quickViewPiece, selectedFit).map((sz: string) => (
                        <button
                          key={sz}
                          type="button"
                          className={`${styles.sizeBtn} ${selectedSize === sz ? styles.sizeActive : ""}`}
                          onClick={() => setSelectedSize((prev) => (prev === sz ? "" : sz))}
                        >
                          {formatSizeLabel(sz, selectedFit, quickViewPiece.wearTag)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {!selectedSize ? (
                    <p className={styles.modalHint}>Pick a size to add to cart.</p>
                  ) : null}

                  <div className={styles.modalQtyRow}>
                    <div className={styles.qtyLeft}>
                      <span className={styles.qtyLabel}>Quantity:</span>
                    <div className={styles.qtyControl}>
                      <button
                        type="button"
                        className={styles.qtyBtn}
                        onClick={() => setQty(Math.max(1, qty - 1))}
                      >
                        -
                      </button>
                      <span className={styles.qtyVal}>{qty}</span>
                      <button
                        type="button"
                        className={styles.qtyBtn}
                        onClick={() => {
                          if (qty < quickViewPiece.quantity) {
                            setQty(qty + 1);
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
                      type="button"
                      className={`btn btn-primary ${styles.modalAddBtn}`}
                      onClick={handleAddToCart}
                      disabled={addStatus !== "idle" || !selectedSize || quickViewPiece.isOutOfStock}
                    >
                      {quickViewPiece.isOutOfStock
                        ? "Out of Stock"
                        : addStatus === "idle"
                          ? "Add To Cart"
                          : addStatus === "adding"
                            ? "Adding..."
                            : "Added"}
                    </button>

                    <button
                      type="button"
                      className={styles.modalWishlistBtn}
                      onClick={() => toggleWishlist(quickViewPiece)}
                    >
                      {isInWishlist(quickViewPiece.id) ? "Saved to wishlist" : "Add to wishlist"}
                    </button>

                    <Link href={`/shop/${quickViewPiece.slug || quickViewPiece.id}`} className={styles.modalFullDetail}>
                      View Full Details →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <section className={`section ${styles.featured}`} id="featured">
      <div className="container">
        <div className={styles.header}>
          <div>
            <span className="section-label">{featuredLabel}</span>
            <h2 className={`t-heading ${styles.heading}`}>Pieces that speak first.</h2>
          </div>
          <Link href="/shop" className={`btn btn-outline ${styles.viewAll}`} id="featured-view-all">
            Shop for more
          </Link>
        </div>

        <div className={styles.grid}>
          {featured.map((item) => (
            <article key={item.id} className={styles.card}>
              <div className={styles.imageWrapOuter}>
                <div className={styles.imageWrap}>
                  {item.hoverImage ? (
                    <>
                      <ProductMedia
                        src={item.image}
                        alt={item.name}
                        className={styles.imagePrimary}
                        loading="lazy"
                      />
                      <ProductMedia
                        src={item.hoverImage}
                        alt=""
                        className={styles.imageHover}
                        loading="lazy"
                        aria-hidden
                      />
                    </>
                  ) : (
                    <ProductMedia
                      src={item.image}
                      alt={item.name}
                      className={styles.image}
                      loading="lazy"
                    />
                  )}

                  <div className={styles.overlay}>
                    <div className={styles.actionButtons}>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      aria-label={isInWishlist(item.id) ? "Remove from wishlist" : "Add to wishlist"}
                      title={isInWishlist(item.id) ? "Saved" : "Add to wishlist"}
                      onClick={() => toggleWishlist(item)}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill={isInWishlist(item.id) ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        suppressHydrationWarning
                      >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                      </svg>
                    </button>

                    <button
                      type="button"
                      className={styles.iconBtn}
                      aria-label="Quick view"
                      title="Quick view"
                      onClick={() => setQuickViewPiece(item)}
                      disabled={item.isOutOfStock}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="6" cy="15" r="4"/><circle cx="18" cy="15" r="4"/><path d="M14 15a2 2 0 0 0-2-2 2 2 0 0 0-2 2"/><path d="M2.5 13 5 7c.7-1.3 1.4-2 3-2"/><path d="M21.5 13 19 7c-.7-1.3-1.5-2-3-2"/>
                      </svg>
                    </button>
                  </div>

                  <div className={styles.ctaRow}>
                    <Link
                      href={`/shop/${item.slug || item.id}`}
                      className={`btn btn-ghost btn-sm ${styles.quickView}`}
                      id={`featured-${item.id}`}
                    >
                      View Piece
                    </Link>
                  </div>
                </div>
                </div>

                <div className={styles.badgeStack} aria-hidden="true">
                  {item.isOutOfStock ? (
                    <span className={styles.tag} style={{ background: "#ef4444" }}>OUT OF STOCK</span>
                  ) : (
                    <>
                      {item.isBestSeller && <span className={styles.tag} style={{ background: "#f59e0b" }}>Bestseller</span>}
                      {item.isLimited && <span className={styles.tag} style={{ background: "#8b5cf6" }}>Limited</span>}
                    </>
                  )}
                </div>
              </div>
              <div className={styles.info}>
                {(() => {
                  const colName = getCollectionName(item);
                  return colName ? <span className={styles.category}>{colName}</span> : null;
                })()}
                <div className="flex justify-between items-baseline">
                  <h3 className={styles.name}>{item.name}</h3>
                  <span className="text-sm font-medium text-zinc-900">GHC {item.price.toLocaleString()}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {modal}
    </section>
  );
}
