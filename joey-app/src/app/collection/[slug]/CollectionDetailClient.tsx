"use client";
import { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { dataStore, SHOP_COLLECTIONS_FALLBACK } from "@/lib/dataStore";
import styles from "../CollectionClient.module.css";
import { usePageHeroBackgroundStyle } from "@/hooks/usePageHero";
import { wishlistStore } from "@/store/wishlistStore";

interface CollectionDetailClientProps {
  slug: string;
}

export default function CollectionDetailClient({ slug }: CollectionDetailClientProps) {
  const products = useSyncExternalStore(dataStore.subscribe, dataStore.getProducts, () => []);
  const collections = useSyncExternalStore(dataStore.subscribe, dataStore.getCollections, () => SHOP_COLLECTIONS_FALLBACK);
  
  const wishlistItems = useSyncExternalStore(wishlistStore.subscribe, wishlistStore.getItems, () => []);
  const [quickViewPiece, setQuickViewPiece] = useState<any | null>(null);
  const [activeImage, setActiveImage] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState("");
  const [addStatus, setAddStatus] = useState<"idle" | "adding" | "added">("idle");
  
  const collectionHeroStyle = usePageHeroBackgroundStyle("collection");

  // Find the specific collection - flexible case comparison
  const collection = collections.find(c => c.slug?.toLowerCase() === slug?.toLowerCase()) || 
                     SHOP_COLLECTIONS_FALLBACK.find(c => c.slug?.toLowerCase() === slug?.toLowerCase());

  // Filter products by this collection
  // We use both category and categoryName for robustness
  const filteredProducts = products.filter(p => 
    p.category?.toLowerCase() === collection?.slug?.toLowerCase() ||
    p.categoryName?.toLowerCase() === collection?.name?.toLowerCase() || 
    p.category?.toLowerCase() === collection?.name?.toLowerCase() ||
    p.category?.toLowerCase() === collection?.slug?.replace(/-/g, " ").toLowerCase()
  );

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

  const isInWishlist = (id: string) => wishlistItems.some(item => item.id === id);
  const toggleWishlist = (p: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInWishlist(p.id)) {
      wishlistStore.removeItem(p.id);
      toast.success("Removed from wishlist");
    } else {
      wishlistStore.addItem({
        id: p.id,
        name: p.name,
        price: p.price,
        image: p.image,
        category: p.categoryName || p.category
      });
      toast.success("Added to wishlist");
    }
  };

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
          maxStock: quickViewPiece.quantity ?? 99
        });
        setAddStatus("added");
        setTimeout(() => setAddStatus("idle"), 2000);
      });
    }, 400);
  };

  if (!collection) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader} style={collectionHeroStyle}>
          <div className="container">
            <span className="section-label">COLLECTIONS</span>
            <h1 className={`t-display ${styles.pageTitle}`}>Collection Not Found</h1>
            <p className={styles.pageSubtext}>
               We couldn't find a collection matching "{slug}".
            </p>
          </div>
        </div>
        <div className="section">
          <div className="container">
             <Link href="/collection" className="btn btn-outline">Back to Collections</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Page header - DYNAMIC based on collection */}
      <div className={styles.pageHeader} style={collectionHeroStyle}>
        <div className="container">
          <span className="section-label">COLLECTIONS</span>
          <h1 className={`t-display ${styles.pageTitle}`}>{collection.name}</h1>
          <p className={styles.pageSubtext}>
            {collection.description}
          </p>
        </div>
      </div>

      {/* Products */}
      <div className={`section ${styles.productsSection}`}>
        <div className="container">
          {filteredProducts.length > 0 ? (
            <div className={styles.grid}>
              {filteredProducts.map((p) => (
                <article key={p.id} className={styles.card}>
                  <div className={styles.imageWrap}>
                    <Link href={`/shop/${p.id}`} className="block h-full w-full">
                      {p.hoverImage ? (
                        <>
                          <img src={p.image} alt={p.name} className={styles.imagePrimary} loading="lazy" />
                          <img src={p.hoverImage} alt="" className={styles.imageHover} loading="lazy" aria-hidden />
                        </>
                      ) : (
                        <img src={p.image} alt={p.name} className={styles.imagePrimary} loading="lazy" />
                      )}
                    </Link>

                    {/* Hover actions overlay */}
                    <div className={styles.productOverlay}>
                      <div className={styles.actionButtons}>
                        <button
                          className={styles.iconBtn}
                          aria-label="Add to Wishlist"
                          title="Add to Wishlist"
                          onClick={(e) => toggleWishlist(p, e)}
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

                      <div className={styles.productPickMeWrap}>
                        {p.isOutOfStock ? (
                          <span className={styles.productPickMeBtn} style={{ opacity: 0.7, background: "rgba(0,0,0,0.2)" }}>
                            Sold Out
                          </span>
                        ) : (
                          <Link
                            href={`/shop/${p.id}`}
                            className={styles.productPickMeBtn}
                            aria-label={`View ${p.name}`}
                          >
                            Pick Me
                          </Link>
                        )}
                      </div>
                    </div>

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
                  <div className={styles.info}>
                    <span className={styles.category}>{p.categoryName || p.category}</span>
                    <h2 className={styles.name}>{p.name}</h2>
                    <div className={styles.priceRow}>
                      <span className={styles.price}>GHC {p.price.toLocaleString()}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <p>No pieces found in this collection yet.</p>
              <Link href="/collection" className="btn btn-outline mt-4">Browse All Collections</Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick View Modal */}
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
                    {[quickViewPiece.image, ...quickViewPiece.images].filter((v, i, a) => a.indexOf(v) === i).map((img, idx) => (
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
                  <span className={styles.modalPrice}>GHC {quickViewPiece.price.toLocaleString()}</span>
                </div>

                <p className={styles.modalDesc}>{quickViewPiece.description}</p>
                <p className={styles.modalDescNote}>
                  Authentic Hand Woven. Available on backorder.
                </p>

                <div className={styles.modalSizeRow}>
                  <span className={styles.qtyLabel}>Size:</span>
                  <div className={styles.sizeGrid}>
                    {["XS", "S", "M", "L", "XL", "Custom"].map((sz) => (
                      <button
                        key={sz}
                        className={`${styles.sizeBtn} ${selectedSize === sz ? styles.sizeActive : ""}`}
                        onClick={() => setSelectedSize(prev => prev === sz ? "" : sz)}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

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
                    disabled={addStatus !== "idle"}
                    style={{ transition: "all 0.3s ease", flex: 1, justifyContent: "center" }}
                  >
                    {addStatus === "idle" && "Add To Cart"}
                    {addStatus === "adding" && "Adding..."}
                    {addStatus === "added" && "Added"}
                  </button>
                  <button
                    className={styles.modalWishlistBtn}
                    onClick={(e) => toggleWishlist(quickViewPiece, e)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={isInWishlist(quickViewPiece.id) ? "var(--alaska-gray)" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" suppressHydrationWarning>
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    {isInWishlist(quickViewPiece.id) ? "Saved" : "Wishlist"}
                  </button>
                </div>

                <div className={styles.modalMeta}>
                  <p><span>SKU:</span> {quickViewPiece.id}</p>
                  <p><span>Category:</span> {quickViewPiece.categoryName || quickViewPiece.category}</p>
                </div>
                <Link href={`/shop/${quickViewPiece.id}`} className={styles.modalFullDetail}>
                  View Full Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
