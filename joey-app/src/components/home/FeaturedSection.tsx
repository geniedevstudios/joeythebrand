"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { Clock } from "lucide-react";
import { useEffect, useMemo, useSyncExternalStore, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { dataStore } from "@/lib/dataStore";
import { wishlistStore } from "@/store/wishlistStore";
import { DEFAULT_SIZES, WOMENS_DEFAULT_SIZES } from "@/lib/dataStore";
import { formatSizeLabel } from "@/lib/formatSizeLabel";
import { useStoreLoading } from "@/hooks/useStoreLoading";
import type { Product } from "@/lib/types";
import type { WishlistItem } from "@/store/wishlistStore";
import ProductMedia from "@/components/shop/ProductMedia";
import SizeGuideModal, { type SizeGuideKind } from "@/components/SizeGuideModal";
import styles from "./FeaturedSection.module.css";

const EMPTY_PRODUCTS: Product[] = [];
const EMPTY_WISHLIST: WishlistItem[] = [];
const EMPTY_COLLECTIONS: any[] = [];



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
  const [quickViewColorVariantId, setQuickViewColorVariantId] = useState<string>("main-color");
  const [quickViewMode, setQuickViewMode] = useState<"solo" | "paired">("solo");
  const [quickViewComboId, setQuickViewComboId] = useState<string>("");
  const [activeImage, setActiveImage] = useState<string>("");
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedFit, setSelectedFit] = useState("Standard");
  const [addStatus, setAddStatus] = useState<"idle" | "adding" | "added">("idle");

  const sizeGuideKind: SizeGuideKind = useMemo(() => {
    const w = String(quickViewPiece?.wearTag ?? "").toLowerCase();
    if (w === "mens") return "mens";
    if (w === "womens") return "womens";
    if (w === "unisex") return "unisex";
    return "both";
  }, [quickViewPiece]);

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
  
  // Filter for featured products (no limit)
  const featured = products.filter(p => p.featured);

  useEffect(() => {
    if (quickViewPiece) {
      document.body.style.overflow = "hidden";
      setQty(1);
      setSelectedSize("");
      setQuickViewColorVariantId("main-color");
      if (quickViewPiece.wearTag === "womens") {
        setSelectedFit("Standard");
      } else if (quickViewPiece.wearTag === "unisex") {
        setSelectedFit("Men");
      } else {
        setSelectedFit("Standard");
      }
      setAddStatus("idle");
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [quickViewPiece]);

  const quickViewColorVariants = useMemo(() => {
    if (!quickViewPiece || !quickViewPiece.variants) return [];
    return quickViewPiece.variants.filter((v: any) => v.type === "color" && v.colorHex);
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

    if (quickViewActiveVariant && quickViewActiveVariant.id !== "main-color" && quickViewActiveVariant.images && quickViewActiveVariant.images.length > 0) {
      imagesToUse = quickViewActiveVariant.images;
    }

    if (quickViewActiveCombo && quickViewActiveCombo.images && quickViewActiveCombo.images.length > 0) {
      imagesToUse = quickViewActiveCombo.images;
    }

    return imagesToUse.filter((img: string) => img && img.trim() !== "");
  }, [quickViewPiece, quickViewActiveVariant, quickViewActiveCombo]);

  useEffect(() => {
    if (quickViewGalleryImages.length > 0) {
      setActiveImage(quickViewGalleryImages[0]);
    }
  }, [quickViewGalleryImages]);

  if (isStoreLoading && featured.length === 0) {
    return <FeaturedSectionSkeleton />;
  }
  if (!isStoreLoading && featured.length === 0) {
    return null;
  }

  const isInWishlist = (id: string) => wishlistItems.some((item) => item.id === id);
  const toggleWishlist = (product: Product) => {
    const wasInWishlist = isInWishlist(product.id);
    wishlistStore.toggleItem({
      id: product.id,
      name: product.name,
      price: String(product.price),
      image: product.image,
      hoverImage: product.hoverImage,
      category: product.categoryName,
    });
    toast.success(wasInWishlist ? `${product.name} removed from wishlist` : `${product.name} added to wishlist`);
  };

  const getAvailableSizes = (prod: Product, fit?: string) => {
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
      return DEFAULT_SIZES.map((s) => s.name);
    }
    return prod.sizes.filter((s) => s.available).map((s) => s.name);
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
        const isBespokeProduct = !!(quickViewPiece.bespokeAvailable && quickViewPiece.quantity <= 0);
        cartStore.addItem({
          productId: quickViewPiece.id,
          name: quickViewPiece.name,
          color: quickViewActiveVariant?.name || (quickViewActiveVariant?.id === "main-color" ? "Main Color" : undefined),
          colorHex: quickViewActiveVariant?.colorHex,
          combo: quickViewActiveCombo ? quickViewActiveCombo.name : undefined,
          size: selectedSize || "Standard",
          fit: (quickViewPiece.wearTag === "womens" || quickViewPiece.wearTag === "unisex") ? selectedFit : undefined,
          wearTag: quickViewPiece.wearTag,
          price: quickViewActiveCombo ? (quickViewActiveCombo.price || quickViewPiece.price) : quickViewPiece.price,
          image: quickViewActiveCombo?.thumbnailUrl || quickViewGalleryImages[0] || quickViewPiece.image,
          quantity: qty,
          maxStock: isBespokeProduct ? 999 : (quickViewPiece.quantity ?? 99),
          isBespoke: isBespokeProduct || undefined,
          bespokeLeadDays: isBespokeProduct ? (quickViewPiece.bespokeLeadDays || 14) : undefined,
        });
        setAddStatus("added");
        setTimeout(() => setAddStatus("idle"), 2000);
      });
    }, 400);
  };

  const formatPrice = (price: number) => `GHC ${price.toLocaleString()}`;



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
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>

              <div className={styles.modalGrid}>
                <div className={styles.modalGallery}>
                  <div className={styles.modalImageWrap} style={{ position: "relative" }}>
                    <ProductMedia
                      src={activeImage || quickViewGalleryImages[0] || quickViewPiece.image}
                      alt={quickViewPiece.name}
                      className={styles.modalImage}
                    />
                    <div className={styles.badgeStack} aria-hidden="true" style={{ left: "var(--space-md)" }}>
                      {(() => {
                        const isBespoke = !!(quickViewPiece.bespokeAvailable && quickViewPiece.quantity <= 0);
                        return isBespoke ? (
                          <span className={styles.tag} style={{ background: "#8b5cf6" }}>BESPOKE ORDER</span>
                        ) : quickViewPiece.isOutOfStock ? (
                          <span className={styles.tag} style={{ background: "#ef4444" }}>OUT OF STOCK</span>
                        ) : (
                          <>
                            {quickViewPiece.category === "sample-sale" && (
                              <span className={styles.tag}>SALE</span>
                            )}
                            {quickViewPiece.isLimited && quickViewPiece.category !== "sample-sale" && (
                              <span className={styles.tag} style={{ background: "#8b5cf6" }}>LIMITED</span>
                            )}
                            {quickViewPiece.isBestSeller && (
                              <span className={styles.tag} style={{ background: "#f59e0b" }}>BEST SELLER</span>
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
                          type="button"
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
                              const isSoloUnavailable = v.isOutOfStock || (typeof v.quantity === "number" ? v.quantity <= 0 : !!v.bespokeAvailable);
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
                            title={v.id === "main-color" ? "Main Color" : "Additional Color"}
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
                  <h3 id="featured-quickview-title" className={`t-display ${styles.modalTitle}`}>
                    {quickViewPiece.name} {quickViewActiveCombo ? (quickViewActiveCombo.nameFormat === "brackets" ? `(${quickViewActiveCombo.name})` : `+ ${quickViewActiveCombo.name}`) : ""}
                  </h3>
                  <div className={styles.modalPriceRow}>
                    <span className={styles.modalPrice}>{formatPrice(quickViewActiveCombo ? (quickViewActiveCombo.price || quickViewPiece.price) : quickViewPiece.price)}</span>
                    {!quickViewActiveCombo && (quickViewPiece as any).originalPrice && <span className={styles.modalOriginalPrice}>{formatPrice((quickViewPiece as any).originalPrice)}</span>}
                  </div>

                  <p className={styles.modalDesc}>{quickViewPiece.description}</p>

                  {(quickViewPiece.wearTag === "womens" || quickViewPiece.wearTag === "unisex") && (
                    <div className={styles.modalSizeRow} style={{ marginBottom: "1rem" }}>
                      <span className={styles.qtyLabel}>{quickViewPiece.wearTag === "unisex" ? "Gender:" : "Fit:"}</span>
                      <div className={styles.modalFitSelector}>
                        {(quickViewPiece.wearTag === "unisex" ? ["Men", "Women"] : ["Standard", "Thick"]).map((fit) => (
                          <button
                            key={fit}
                            type="button"
                            className={`${styles.fitBtn} ${selectedFit === fit ? styles.fitBtnActive : ""}`}
                            onClick={() => { setSelectedFit(fit); setSelectedSize(""); }}
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
                    const isBespoke = !!(quickViewPiece.bespokeAvailable && quickViewPiece.quantity <= 0);
                    return isBespoke ? (
                      <p className={styles.customNotice} style={{ color: "#5b21b6", background: "#f5f3ff" }}>
                        🧵 Bespoke order. Expect ~{quickViewPiece.bespokeLeadDays || 14} days for production.
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
                            const isBespoke = !!(quickViewPiece.bespokeAvailable && quickViewPiece.quantity <= 0);
                            if (isBespoke || qty < (quickViewPiece.quantity ?? 999)) {
                              setQty(qty + 1);
                            } else {
                              toast.error(`Only ${quickViewPiece.quantity} items available.`);
                            }
                          }}
                          disabled={!(!!(quickViewPiece.bespokeAvailable && quickViewPiece.quantity <= 0)) && qty >= (quickViewPiece.quantity ?? 999)}
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
                      const isBespoke = !!(quickViewPiece.bespokeAvailable && quickViewPiece.quantity <= 0);
                      return (
                        <button
                          type="button"
                          className={`btn btn-primary ${styles.modalAddBtn}`}
                          onClick={handleAddToCart}
                          disabled={(quickViewPiece.isOutOfStock && !isBespoke) || addStatus !== "idle"}
                          style={{ transition: "all 0.3s ease" }}
                        >
                          {quickViewPiece.isOutOfStock && !isBespoke
                            ? "Out of Stock"
                            : isBespoke
                              ? (addStatus === "idle" ? "Order Bespoke" : addStatus === "adding" ? "Adding..." : "Added 👍")
                              : (addStatus === "idle" ? "Add To Cart" : addStatus === "adding" ? "Adding..." : "Added 👍")}
                        </button>
                      );
                    })()}

                    <button
                      type="button"
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
                    const isBespoke = !!(quickViewPiece.bespokeAvailable && quickViewPiece.quantity <= 0);
                    return isBespoke ? (
                      <div role="status" aria-live="polite" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "10px", marginTop: "16px", marginBottom: "2px", fontSize: "0.95rem", color: "rgba(20, 20, 20, 0.78)", background: "#f5f3ff", borderColor: "#c4b5fd", padding: "8px", borderRadius: "6px" }}>
                        <Clock aria-hidden style={{ flex: "0 0 auto", opacity: 0.85, width: "18px", height: "18px", color: "#7c3aed" }} />
                        <span style={{ color: "#5b21b6" }}>
                          bespoke piece would be handcrafted for you within {quickViewPiece.bespokeLeadDays || 14} days
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
          {featured.map((item) => {
            const colorVariants = (item.variants || []).filter((v: any) => v.type === "color" && v.colorHex);
            const hasColors = colorVariants.length > 0;
            const swatchesToShow = colorVariants.slice(0, 3);
            const totalColors = colorVariants.length;

            return (
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

                    {hasColors && (
                      <div className={styles.colorIndicatorWrap} aria-label={`${totalColors} colors available`}>
                        {swatchesToShow.map((v: any) => (
                          <div
                            key={v.id}
                            className={styles.colorSwatch}
                            style={{ backgroundColor: v.colorHex || "#ccc", backgroundImage: (v.thumbnailUrl || (v.images && v.images[0]) || (v.id === "main-color" ? item.image : null) || (v.combos && v.combos[0]?.thumbnailUrl) || (v.combos && v.combos[0]?.images?.[0]) || null) ? `url(${v.thumbnailUrl || (v.images && v.images[0]) || (v.id === "main-color" ? item.image : null) || (v.combos && v.combos[0]?.thumbnailUrl) || (v.combos && v.combos[0]?.images?.[0]) || ""})` : "none", backgroundSize: "cover", backgroundPosition: "center" }}
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
                  {(() => {
                    const isBespoke = !!(item.bespokeAvailable && item.quantity <= 0);
                    return isBespoke ? (
                      <span className={styles.tag} style={{ background: "#8b5cf6" }}>BESPOKE ORDER</span>
                    ) : item.isOutOfStock ? (
                      <span className={styles.tag} style={{ background: "#ef4444" }}>OUT OF STOCK</span>
                    ) : (
                      <>
                        {item.category === "sample-sale" && (
                          <span className={styles.tag}>SALE</span>
                        )}
                        {item.isLimited && item.category !== "sample-sale" && (
                          <span className={styles.tag} style={{ background: "#8b5cf6" }}>LIMITED</span>
                        )}
                        {item.isBestSeller && (
                          <span className={styles.tag} style={{ background: "#f59e0b" }}>BEST SELLER</span>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className={styles.info}>
                {(() => {
                  const colName = getCollectionName(item);
                  return colName ? <span className={styles.category}>{colName}</span> : null;
                })()}
                <h3 className={styles.name}>{item.name}</h3>
                <div className={styles.priceRow}>
                  <span className={styles.price}>{formatPrice(item.price)}</span>
                </div>
              </div>
            </article>
          );
        })}
        </div>
      </div>

      {modal}
      {typeof document !== "undefined" && createPortal(
        <SizeGuideModal open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} kind={sizeGuideKind} />,
        document.body,
      )}
    </section>
  );
}

// Trigger rebuild
