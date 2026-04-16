"use client";
import { useState, useEffect, useSyncExternalStore, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { wishlistStore } from "@/store/wishlistStore";
import { dataStore, DEFAULT_SIZES } from "@/lib/dataStore";
import { usePageHeroImageSrc, usePageHeroMedia } from "@/hooks/usePageHero";
import { resolveHeroLayout } from "@/lib/pageHeroes";
import styles from "./ProductClient.module.css";

const EMPTY_ARRAY: any[] = [];

const SUGGESTION_PHRASES = [
  "You may also like",
  "You can pair these with",
  "Don't leave without taking a look at these",
  "Others who loved this also picked up",
  "Complete the look",
  "While you're here — don't miss these",
];

function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = (h * 1664525 + 1013904223) | 0;
    return (h >>> 0) / 4294967296;
  };
}

export default function ProductClient({ id }: { id: string }) {
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [addStatus, setAddStatus] = useState<"idle" | "adding" | "added">("idle");
  const [activeImage, setActiveImage] = useState<string>("");
  const [quickViewItem, setQuickViewItem] = useState<any>(null);
  const [quickViewSize, setQuickViewSize] = useState("");
  const [quickViewImage, setQuickViewImage] = useState("");

  const products = useSyncExternalStore(dataStore.subscribe, dataStore.getProducts, () => EMPTY_ARRAY);
  const wishlistItems = useSyncExternalStore(wishlistStore.subscribe, wishlistStore.getItems, () => EMPTY_ARRAY);
  const isInWishlist = (itemId: string) => wishlistItems.some(item => item.id === itemId);

  const toggleWishlist = (item: any) => {
    const wasInWishlist = isInWishlist(item.id);
    wishlistStore.toggleItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      hoverImage: item.hoverImage,
      category: item.categoryName,
    });
    toast.success(wasInWishlist ? `${item.name} removed from wishlist` : `${item.name} added to wishlist`);
  };
  
  const product = products.find((p: any) => p.id === id);

  const galleryImages = useMemo(() => {
    if (!product || !product.images) return EMPTY_ARRAY;
    return product.images.filter((img: string) => img !== product.hoverImage);
  }, [product?.images, product?.hoverImage]);

  useEffect(() => {
    if (galleryImages.length > 0) {
      setActiveImage(galleryImages[0]);
    }
  }, [galleryImages]);

  const { suggestedProducts, suggestionPhrase } = useMemo(() => {
    if (!product || products.length === 0) {
      return { suggestedProducts: [], suggestionPhrase: SUGGESTION_PHRASES[0] };
    }
    const rand = seededRandom(product.id);
    const phrase = SUGGESTION_PHRASES[Math.floor(rand() * SUGGESTION_PHRASES.length)];
    const pool = [...products.filter((p: any) => p.id !== product.id)];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return { suggestedProducts: pool.slice(0, 5), suggestionPhrase: phrase };
  }, [product?.id, products]);

  const getAvailableSizes = (prod: any) => {
    if (!prod?.sizes || prod.sizes.length < 6) {
      return DEFAULT_SIZES.map(s => s.name);
    }
    return prod.sizes.filter((s: any) => s.available).map((s: any) => s.name);
  };

  const formatPrice = (price: number) => `GHC ${price.toLocaleString()}`;
  const productHeroSrc = usePageHeroImageSrc("product");
  const productHeroMedia = usePageHeroMedia("product");
  const productHeroLayout = resolveHeroLayout(productHeroMedia);

  if (!product) {
    return (
      <div className={styles.page}>
        <div className="container" style={{ textAlign: "center", padding: "100px 0" }}>
          <h1 className="t-heading" style={{ color: "var(--blue-athracite)" }}>Piece not found.</h1>
          <p style={{ marginTop: "var(--space-md)", color: "var(--alaska-gray)" }}>This item may have been removed or sold out.</p>
          <Link href="/shop" className="btn btn-outline" style={{ marginTop: "var(--space-xl)" }}>
            Return to Collection
          </Link>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (!selectedSize && product.sizes.length > 0) {
      toast.error("Please pick a size before adding to cart.");
      return;
    }
    
    setAddStatus("adding");

    setTimeout(() => {
      import("@/store/cartStore").then(({ cartStore }) => {
        cartStore.addItem({
          productId: product.id,
          name: product.name,
          size: selectedSize || "Standard",
          price: product.price,
          image: product.image,
          quantity: qty,
          maxStock: product.quantity,
        });
        
        setAddStatus("added");
        toast.success(`${product.name} added to your cart!`);
        setTimeout(() => setAddStatus("idle"), 2000);
      });
    }, 400);
  };



  return (
    <>
    <div className={styles.page}>
      <div className={styles.heroBanner}>
        <div className={styles.heroBannerBg}>
          <img
            src={productHeroSrc}
            alt=""
            className={styles.heroBannerImg}
            style={{
              objectFit: productHeroLayout.fit === "contain" ? "contain" : "cover",
              objectPosition: productHeroLayout.position,
            }}
          />
          <div className={styles.heroBannerOverlay} />
        </div>
      </div>

      <div className={styles.breadcrumbs}>
        <div className="container">
          <Link href="/shop" className={styles.crumbLink}>Shop</Link>
          <span className={styles.crumbSeparator}>/</span>
          <span className={styles.crumbLink}>{product.categoryName}</span>
          <span className={styles.crumbSeparator}>/</span>
          <span className={styles.crumbCurrent}>{product.name}</span>
        </div>
      </div>

      <div className="container">
        <div className={styles.layout}>
          <div className={styles.galleryCol}>
            <div className={styles.mainImageWrap}>
              <img 
                src={activeImage || galleryImages[0] || product.image} 
                alt={product.name} 
                className={styles.mainImage} 
              />
              <div className={styles.badgeStack} aria-hidden="true">
                {product.isOutOfStock ? (
                  <span className={styles.saleBadge} style={{ background: "#ef4444" }}>OUT OF STOCK</span>
                ) : (
                  <>
                    {product.category === "sample-sale" && (
                      <span className={styles.saleBadge}>SALE</span>
                    )}
                    {product.isLimited && product.category !== "sample-sale" && (
                      <span className={styles.saleBadge} style={{ background: "#8b5cf6" }}>LIMITED</span>
                    )}
                  </>
                )}
              </div>
            </div>

            {galleryImages.length > 1 && (
              <div className={styles.thumbnails}>
                {galleryImages.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    className={`${styles.thumb} ${(activeImage || galleryImages[0]) === img ? styles.thumbActive : ""}`}
                    onClick={() => setActiveImage(img)}
                    aria-label={`View image ${idx + 1}`}
                  >
                    <img src={img} alt={`${product.name} view ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={styles.infoCol}>
            <div className={styles.infoSticky}>
              <span className={styles.categoryLabel}>{product.categoryName}</span>
              <h1 className={`t-display ${styles.productName}`}>{product.name}</h1>
              
              <div className={styles.priceRow}>
                <span className={styles.price}>{formatPrice(product.price)}</span>
                {product.originalPrice && <span className={styles.originalPrice}>{formatPrice(product.originalPrice)}</span>}
              </div>

              <div className={styles.divider} />

              <div className={styles.description}>
                <p>{product.description}</p>
              </div>

              <div className={styles.sizeSection}>
                <div className={styles.sizeHeader}>
                  <span className={styles.sizeLabel}>Size</span>
                  <button className={styles.sizeGuideBtn}>Size Guide</button>
                </div>
                <div className={styles.sizeGrid}>
                  {getAvailableSizes(product).map((size: string) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(prev => prev === size ? "" : size)}
                      className={`${styles.sizeBtn} ${selectedSize === size ? styles.sizeBtnActive : ""}`}
                      aria-pressed={selectedSize === size}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                {selectedSize === "Custom" && (
                  <p className={styles.customNotice}>
                    Custom sizing selected. We will contact you for measurements after checkout.
                  </p>
                )}
              </div>

              {product.isOutOfStock && (
                <p className={styles.customNotice} style={{ color: "#c00", background: "#fee", marginTop: "12px" }}>
                  This item is currently out of stock.
                </p>
              )}

              <div className={styles.qtySection}>
                <div className={styles.qtyHeader}>
                  <span className={styles.qtyLabel}>Quantity</span>
                  {product.quantity > 0 && product.quantity < 6 && (
                    <span className={styles.lowStockWarning}>Only {product.quantity} left</span>
                  )}
                </div>
                <div className={styles.qtyControl}>
                  <button className={styles.qtyBtn} onClick={() => setQty(Math.max(1, qty - 1))}>-</button>
                  <span className={styles.qtyVal}>{qty}</span>
                  <button 
                    className={styles.qtyBtn} 
                    onClick={() => {
                      if (qty < product.quantity) {
                        setQty(qty + 1);
                      } else {
                        toast.error(`Only ${product.quantity} items available in stock.`);
                      }
                    }}
                    disabled={qty >= product.quantity}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className={styles.actions}>
                <div className={styles.actionBtns}>
                  <button 
                    className="btn btn-primary btn-lg" 
                    style={{ justifyContent: "center", transition: "all 0.3s ease" }}
                    onClick={handleAddToCart}
                    disabled={addStatus !== "idle" || product.isOutOfStock}
                  >
                    {product.isOutOfStock ? "Out of Stock" : addStatus === "idle" ? "Add To Cart" : addStatus === "adding" ? "Adding..." : "Added ✓"}
                  </button>
                  <button 
                    className={`btn btn-outline btn-lg ${styles.wishlistBtn}`}
                    onClick={() => toggleWishlist(product)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={isInWishlist(product.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    {isInWishlist(product.id) ? "Saved" : "Wishlist"}
                  </button>
                </div>
                <div className={styles.supportLinks}>
                  <p>Questions about this piece?</p>
                  <Link
                    href="/contact?subject=general"
                    className={styles.waLink}
                  >
                    Get in touch
                  </Link>
                </div>
              </div>

              <div className={styles.detailsList}>
                {(product.details ?? []).filter((d: string) => d?.trim()).length > 0 ? (
                  <div className={styles.detailBlock}>
                    <h3 className={styles.detailHeading}>The Details</h3>
                    <ul className={styles.detailUl}>
                      {(product.details ?? [])
                        .filter((d: string) => d?.trim())
                        .map((d: string, i: number) => (
                          <li key={i}>{d.trim()}</li>
                        ))}
                    </ul>
                  </div>
                ) : null}
                <div className={styles.detailBlock}>
                  <h3 className={styles.detailHeading}>Shipping & Returns</h3>
                  <p className={styles.detailText}>
                    Standard processing takes 3-5 business days. Delivery within Accra takes 1-2 days. 
                    Returns accepted within 7 days for ready-to-wear pieces. Custom or sample pieces are final sale.
                  </p>
                  <Link href="/shipping" className={styles.waLink} style={{ marginTop: "8px", display: "inline-block" }}>
                    Read full policy
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </div>

        {suggestedProducts.length > 0 && (
          <div className={styles.suggestionsSection}>
            <div className={styles.suggestionsHeader}>
              <h2 className={styles.suggestionsTitle}>{suggestionPhrase}</h2>
              <Link href="/shop" className={styles.seeAllLink}>See all pieces →</Link>
            </div>
            <div className={styles.suggestionsGrid}>
              {suggestedProducts.map((item: any) => (
                <article key={item.id} className={styles.suggestCard}>
                  <div className={styles.suggestImgWrap}>
                    {item.hoverImage ? (
                      <>
                        <img src={item.image} alt={item.name} className={styles.suggestImgPrimary} loading="lazy" />
                        <img src={item.hoverImage} alt="" className={styles.suggestImgHover} loading="lazy" aria-hidden />
                      </>
                    ) : (
                      <img src={item.image} alt={item.name} className={styles.suggestImg} loading="lazy" />
                    )}
                    <div className={styles.suggestBadgeStack} aria-hidden="true">
                      {item.isOutOfStock ? (
                        <span className={styles.suggestBadgeSale} style={{ background: "#ef4444" }}>OUT OF STOCK</span>
                      ) : (
                        <>
                          {item.category === "limited-edition" && (
                            <span className={styles.suggestBadge}>Limited</span>
                          )}
                          {item.category === "sample-sale" && (
                            <span className={styles.suggestBadgeSale}>Sale</span>
                          )}
                        </>
                      )}
                    </div>

                    <div className={styles.suggestOverlay}>
                      <div className={styles.suggestActions}>
                        <button
                          className={styles.suggestIconBtn}
                          aria-label="Add to Wishlist"
                          title="Add to Wishlist"
                          onClick={() => toggleWishlist(item)}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill={isInWishlist(item.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                          </svg>
                        </button>
                        <button
                          className={styles.suggestIconBtn}
                          aria-label="Quick View"
                          title="Quick View"
                          onClick={() => { setQuickViewItem(item); setQuickViewSize(""); setQuickViewImage(item.image); }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="6" cy="15" r="4"/><circle cx="18" cy="15" r="4"/><path d="M14 15a2 2 0 0 0-2-2 2 2 0 0 0-2 2"/><path d="M2.5 13 5 7c.7-1.3 1.4-2 3-2"/><path d="M21.5 13 19 7c-.7-1.3-1.5-2-3-2"/>
                          </svg>
                        </button>
                      </div>

                      <div className={styles.suggestPickMeWrap}>
                        {item.isOutOfStock ? (
                          <span className={`${styles.suggestPickMeBtn} ${styles.soldOutBtn}`}>
                            Sold Out
                          </span>
                        ) : (
                          <Link
                            href={`/shop/${item.id}`}
                            className={styles.suggestPickMeBtn}
                            aria-label={`View ${item.name}`}
                          >
                            Pick Me
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className={styles.suggestInfo}>
                    <p className={styles.suggestCategory}>{item.categoryName}</p>
                    <p className={styles.suggestName}>{item.name}</p>
                    <p className={styles.suggestPrice}>{formatPrice(item.price)}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>

    {quickViewItem && (
      <div className={styles.modalBackdrop} onClick={() => { setQuickViewItem(null); setQuickViewImage(""); }}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <button className={styles.modalClose} onClick={() => { setQuickViewItem(null); setQuickViewImage(""); }} aria-label="Close modal">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <div className={styles.modalGrid}>
            <div className={styles.modalGallery}>
              <div className={styles.modalImageWrap}>
                <img src={quickViewImage || quickViewItem.image} alt={quickViewItem.name} className={styles.modalImage} />
              </div>
              {quickViewItem.images && 
               quickViewItem.images.filter((img: string) => img !== quickViewItem.hoverImage).length > 1 && (
                <div className={styles.modalThumbnails}>
                  {quickViewItem.images
                    .filter((img: string) => img !== quickViewItem.hoverImage)
                    .map((img: string, idx: number) => (
                      <button 
                        key={idx} 
                        className={`${styles.thumbBtn} ${(quickViewImage || quickViewItem.image) === img ? styles.thumbActive : ""}`}
                        aria-label={`Thumbnail ${idx + 1}`}
                        onClick={() => setQuickViewImage(img)}
                      >
                        <img src={img} alt={`Thumbnail ${idx + 1}`} className={styles.thumbImage} />
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div className={styles.modalInfo}>
              <h2 className={`t-display ${styles.modalTitle}`}>{quickViewItem.name}</h2>
              <div className={styles.modalPriceRow}>
                <span className={styles.modalPrice}>{formatPrice(quickViewItem.price)}</span>
                {quickViewItem.originalPrice && <span className={styles.modalOriginalPrice}>{formatPrice(quickViewItem.originalPrice)}</span>}
              </div>
              
              <p className={styles.modalDesc}>{quickViewItem.description}</p>
              <p className={styles.modalDescNote}>
                Authentic Hand Woven. Available on backorder.
              </p>
              
              <div className={styles.modalSizeRow}>
                <span className={styles.qtyLabel}>Size:</span>
                <div className={styles.sizeGrid}>
                  {getAvailableSizes(quickViewItem).map((sz: string) => (
                    <button 
                      key={sz} 
                      className={`${styles.sizeBtn} ${quickViewSize === sz ? styles.sizeBtnActive : ""}`}
                      onClick={() => setQuickViewSize(prev => prev === sz ? "" : sz)}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
                <button className={styles.sizeGuideBtn}>Size Guide</button>
              </div>
              {quickViewSize === "Custom" && (
                <p className={styles.customNotice}>
                  Custom sizing selected. We will contact you for measurements after checkout.
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
                        if (qty < (quickViewItem.quantity ?? 999)) {
                          setQty(qty + 1);
                        } else {
                          toast.error(`Only ${quickViewItem.quantity} items available.`);
                        }
                      }}
                      disabled={qty >= (quickViewItem.quantity ?? 999)}
                    >
                      +
                    </button>
                  </div>
                </div>

                {typeof quickViewItem.quantity === "number" && quickViewItem.quantity > 0 && quickViewItem.quantity < 6 && (
                  <span className={styles.lowStockWarning}>Only {quickViewItem.quantity} left</span>
                )}
              </div>

              <div className={styles.modalActions}>
                <button 
                  className={`btn btn-primary ${styles.modalAddBtn}`} 
                  onClick={() => {
                    if (!quickViewSize && quickViewItem.sizes?.length) {
                      toast.error(`Please select a size for ${quickViewItem.name} first!`);
                      return;
                    }

                    import("@/store/cartStore").then(({ cartStore }) => {
                      cartStore.addItem({
                        productId: quickViewItem.id,
                        name: quickViewItem.name,
                        size: quickViewSize || "Standard",
                        price: quickViewItem.price,
                        image: quickViewItem.image,
                        quantity: qty,
                        maxStock: quickViewItem.quantity,
                      });
                      toast.success(`${quickViewItem.name} added to your cart!`);
                      setQuickViewItem(null);
                      setQuickViewImage("");
                    });
                  }}
                  style={{ transition: "all 0.3s ease" }}
                >
                  Add To Cart
                </button>
                <button 
                  className={styles.modalWishlistBtn}
                  onClick={() => toggleWishlist(quickViewItem)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={isInWishlist(quickViewItem.id) ? "var(--alaska-gray)" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                  {isInWishlist(quickViewItem.id) ? "Saved to wishlist" : "Add to wishlist"}
                </button>
              </div>

              <div className={styles.modalMeta}>
                <p><span>SKU:</span> {quickViewItem.id}</p>
                <p><span>Categories:</span> {quickViewItem.categoryName}</p>
              </div>
              <Link href={`/shop/${quickViewItem.id}`} className={styles.modalFullDetail} onClick={() => { setQuickViewItem(null); setQuickViewImage(""); }}>
                View Full Details →
              </Link>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
  );
}
