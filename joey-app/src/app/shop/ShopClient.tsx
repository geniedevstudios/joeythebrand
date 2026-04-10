"use client";
import { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { toast } from "sonner";
import styles from "./ShopClient.module.css";
import { wishlistStore } from "@/store/wishlistStore";
import { dataStore, DEFAULT_SIZES } from "@/lib/dataStore";

type Category = "all" | "always-lit" | "limited-edition" | "sample-sale";

const tabs: { id: Category; label: string; sub: string }[] = [
  { id: "all", label: "All Pieces", sub: "The full wardrobe" },
  { id: "always-lit", label: "Always Lit", sub: "Available every season" },
  { id: "limited-edition", label: "Limited Edition", sub: "Rare. One-time only." },
  { id: "sample-sale", label: "Sample Sale", sub: "Heavily discounted" },
];

const EMPTY_ARRAY: any[] = [];

export default function ShopClient() {
  const [active, setActive] = useState<Category>("all");
  const [quickViewPiece, setQuickViewPiece] = useState<any>(null);
  const [activeImage, setActiveImage] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState("");
  const products = useSyncExternalStore(dataStore.subscribe, dataStore.getProducts, () => EMPTY_ARRAY);
  const wishlistItems = useSyncExternalStore(wishlistStore.subscribe, wishlistStore.getItems, () => EMPTY_ARRAY);
  const [addStatus, setAddStatus] = useState<"idle" | "adding" | "added">("idle");

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
          quantity: qty
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

  const filtered = active === "all" ? products : products.filter((p: any) => p.category === active);

  const formatPrice = (price: number) => `GHC ${price.toLocaleString()}`;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className="container">
          <span className="section-label">The Shop</span>
          <h1 className={`t-display ${styles.pageTitle}`}>Shop</h1>
          <p className={styles.pageSubtext}>
            Every piece crafted with intention.
          </p>
        </div>
      </div>

      <div className={styles.tabsBar}>
        <div className={`container ${styles.tabsInner}`}>
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`${styles.tab} ${active === t.id ? styles.tabActive : ""}`}
              onClick={() => setActive(t.id)}
              id={`tab-${t.id}`}
              aria-pressed={active === t.id}
            >
              <span className={styles.tabLabel}>{t.label}</span>
              <span className={styles.tabSub}>{t.sub}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={`section ${styles.productsSection}`}>
        <div className="container">
          {filtered.length === 0 ? (
            <div className={styles.empty}>
              <p>No pieces in this category yet. Check back soon.</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {filtered.map((p: any) => (
                <article key={p.id} className={styles.card}>
                  <div className={styles.imageWrap}>
                    <img src={p.image} alt={p.name} className={styles.image} loading="lazy" />
                    
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
                        <Link
                          href={`/shop/${p.id}`}
                          className={styles.pickMeBtn}
                          aria-label={`View ${p.name}`}
                        >
                          Pick Me
                        </Link>
                      </div>
                    </div>

                    {p.category === "sample-sale" && (
                      <span className={styles.saleBadge}>SALE</span>
                    )}
                    {p.isLimited && p.category !== "sample-sale" && (
                      <span className={styles.saleBadge} style={{ background: "#8b5cf6" }}>LIMITED</span>
                    )}
                    {p.isBestSeller && (
                      <span className={styles.saleBadge} style={{ background: "#f59e0b" }}>BEST SELLER</span>
                    )}
                  </div>
                  <div className={styles.info}>
                    <span className={styles.category}>
                      {tabs.find((t) => t.id === p.category)?.label}
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
                  <img src={activeImage || quickViewPiece.image} alt={quickViewPiece.name} className={styles.modalImage} />
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
                        <img src={img} alt={`Thumbnail ${idx + 1}`} className={styles.thumbImage} />
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
                <p className={styles.modalDescNote}>
                  Authentic Hand Woven. Available on backorder.
                </p>
                
                <div className={styles.modalSizeRow}>
                  <span className={styles.qtyLabel}>Size:</span>
                  <div className={styles.sizeGrid}>
                    {getAvailableSizes(quickViewPiece).map((sz: string) => (
                      <button 
                        key={sz} 
                        className={`${styles.sizeBtn} ${selectedSize === sz ? styles.sizeActive : ""}`}
                        onClick={() => setSelectedSize(prev => prev === sz ? "" : sz)}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                  <button className={styles.sizeGuideBtn}>Size Guide</button>
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
                  <span className={styles.qtyLabel}>Quantity:</span>
                  <div className={styles.qtyControl}>
                    <button className={styles.qtyBtn} onClick={() => setQty(Math.max(1, qty - 1))}>-</button>
                    <span className={styles.qtyVal}>{qty}</span>
                    <button className={styles.qtyBtn} onClick={() => setQty(qty + 1)}>+</button>
                  </div>
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
                  <p><span>SKU:</span> {quickViewPiece.id}</p>
                  <p><span>Categories:</span> {tabs.find((t) => t.id === quickViewPiece.category)?.label}</p>
                </div>
                <Link href={`/shop/${quickViewPiece.id}`} className={styles.modalFullDetail}>
                  View Full Details →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
