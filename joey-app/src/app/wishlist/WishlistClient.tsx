"use client";
import { useState, useSyncExternalStore, useMemo, useEffect } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import { wishlistStore, type WishlistItem } from "@/store/wishlistStore";
import { cartStore } from "@/store/cartStore";
import styles from "./WishlistClient.module.css";
import PageHeroShellImageLoader from "@/components/page-hero/PageHeroShellImageLoader";
import { PAGE_HERO_SHELL_CLASS, usePageHeroShellRenderProps } from "@/hooks/usePageHero";
import ProductMedia from "@/components/shop/ProductMedia";
import { dataStore, DEFAULT_SIZES, WOMENS_DEFAULT_SIZES } from "@/lib/dataStore";
import shopStyles from "../shop/ShopClient.module.css";
import productStyles from "../shop/[slug]/ProductClient.module.css";
import { formatSizeLabel } from "@/lib/formatSizeLabel";
import SizeGuideModal, { type SizeGuideKind } from "@/components/SizeGuideModal";
import ProductSuggestions from "@/components/shop/ProductSuggestions";
import { getVariantStockStatus, getIsSoloUnavailable } from "@/lib/variantUtils";

import type { Product } from "@/lib/types";

const EMPTY_ARRAY: WishlistItem[] = [];
const EMPTY_PRODUCTS: Product[] = [];
type AddStatus = "idle" | "adding" | "added";

export default function WishlistClient() {
  const items = useSyncExternalStore(wishlistStore.subscribe, wishlistStore.getItems, () => EMPTY_ARRAY);
  const products = useSyncExternalStore(dataStore.subscribe, dataStore.getProducts, () => EMPTY_PRODUCTS);
  const [quickAddStatus, setQuickAddStatus] = useState<AddStatus>("idle");
  
  const {
    empty: wishlistHeroEmpty,
    shellSpinner: wishlistHeroSpinner,
    style: wishlistHeroStyle,
    showImageLoader: wishlistHeroImageLoader,
    imageReady: wishlistHeroImageReady,
  } = usePageHeroShellRenderProps("wishlist");

  const [quickViewPiece, setQuickViewPiece] = useState<Product | null>(null);
  const [quickViewColorVariantId, setQuickViewColorVariantId] = useState<string>("main-color");
  const [quickViewMode, setQuickViewMode] = useState<"solo" | "paired">("solo");
  const [quickViewComboId, setQuickViewComboId] = useState<string>("");
  const [quickViewFit, setQuickViewFit] = useState("Standard");
  const [quickViewSize, setQuickViewSize] = useState("");
  const [activeImage, setActiveImage] = useState("");
  const [qty, setQty] = useState(1);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  useEffect(() => {
    if (quickViewPiece) {
      document.body.style.overflow = "hidden";
      setQuickViewSize("");
      setQty(1);
      setQuickViewColorVariantId("main-color");
      if (quickViewPiece.wearTag === "womens") {
        setQuickViewFit("Standard");
      } else if (quickViewPiece.wearTag === "unisex") {
        setQuickViewFit("Men");
      } else {
        setQuickViewFit("Standard");
      }
    } else {
      document.body.style.overflow = "";
      setSizeGuideOpen(false);
    }
  }, [quickViewPiece]);

  const sizeGuideKind: SizeGuideKind = useMemo(() => {
    const w = String(quickViewPiece?.wearTag ?? "").toLowerCase();
    if (w === "mens") return "mens";
    if (w === "womens") return "womens";
    if (w === "unisex") return "unisex";
    return "both";
  }, [quickViewPiece]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (sizeGuideOpen) setSizeGuideOpen(false);
        else setQuickViewPiece(null);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [sizeGuideOpen]);

  const handleRemove = (id: string, name: string) => {
    wishlistStore.removeItem(id);
    toast.success(`${name} removed from wishlist`);
  };

  const handleAddToCartQuick = () => {
    if (!quickViewPiece) return;
    if (!quickViewSize && quickViewPiece.sizes?.length) {
      toast.error(`Please select a size for ${quickViewPiece.name} first!`);
      return;
    }

    setQuickAddStatus("adding");

    setTimeout(() => {
      const priceNum = Number(String(quickViewActiveCombo ? (quickViewActiveCombo.price || quickViewPiece.price) : quickViewPiece.price).replace(/[^0-9.-]+/g, ""));
      const stockStatus = getVariantStockStatus(quickViewPiece, quickViewActiveVariant, quickViewActiveCombo, quickViewMode);
      const isBespokeProduct = stockStatus.isBespokeProduct;
      cartStore.addItem({
        productId: quickViewPiece.id,
        name: quickViewPiece.name,
        color: quickViewActiveVariant?.name ,
        colorHex: quickViewActiveVariant?.colorHex,
        combo: quickViewActiveCombo ? quickViewActiveCombo.name : undefined,
        size: quickViewSize || "Standard",
        fit: (quickViewPiece.wearTag === "womens" || quickViewPiece.wearTag === "unisex") ? quickViewFit : undefined,
        wearTag: quickViewPiece.wearTag,
        price: priceNum,
        image: quickViewActiveCombo?.thumbnailUrl || activeImage || quickViewGalleryImages[0] || quickViewPiece.image,
        quantity: qty,
        maxStock: stockStatus.maxStock ?? 99,
        isBespoke: isBespokeProduct || undefined,
        bespokeLeadDays: isBespokeProduct ? (stockStatus.bespokeLeadDays ?? 14) : undefined,
      });

      wishlistStore.removeItem(quickViewPiece.id);
      setQuickAddStatus("added");
      toast.success(`${quickViewPiece.name} added to your cart!`);
      setTimeout(() => {
        setQuickAddStatus("idle");
        setQuickViewPiece(null);
      }, 2000);
    }, 400);
  };

  const handleAddToCart = (item: typeof items[0]) => {
    const fullProduct = products.find(p => p.id === item.id) || (item as unknown as Product);
    setQuickViewPiece(fullProduct);
    toast.info("Please select a size to add to cart");
  };

  const getAvailableSizes = (prod: any, fit?: string) => {
    if (prod?.wearTag === "womens") {
      if (fit === "Thick") return ["S", "M", "L", "XL", "Custom"];
      return WOMENS_DEFAULT_SIZES.map(s => s.name);
    }
    if (prod?.wearTag === "unisex") {
      if (fit === "Women") return ["S", "M", "L", "XL", "Custom"];
      return ["S", "M", "L", "XL", "XXL", "Custom"];
    }
    if (!prod?.sizes || prod.sizes.length === 0) {
      return DEFAULT_SIZES.map(s => s.name);
    }
    return prod.sizes.filter((s: any) => s.available).map((s: any) => s.name);
  };

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
    if (quickViewActiveVariant && quickViewActiveVariant.id !== "main-color" && quickViewActiveVariant.images && quickViewActiveVariant.images.length > 0) {
      imagesToUse = quickViewActiveVariant.images;
    }
    if (quickViewActiveCombo && quickViewActiveCombo.images && quickViewActiveCombo.images.length > 0) {
      imagesToUse = quickViewActiveCombo.images;
    }
    return imagesToUse.filter((img: string) => img && img.trim() !== "").filter((img: string) => img !== quickViewPiece.hoverImage);
  }, [quickViewPiece, quickViewActiveVariant, quickViewActiveCombo]);

  useEffect(() => {
    if (quickViewGalleryImages.length > 0) {
      setActiveImage(quickViewGalleryImages[0]);
    }
  }, [quickViewGalleryImages]);

  const formatPrice = (price: number | string) => {
    if (typeof price === "string") return price;
    return `GHC ${price.toLocaleString()}`;
  };

  return (
    <div className={styles.page}>
      <div
        className={`${PAGE_HERO_SHELL_CLASS} ${styles.pageHeader}`}
        data-page-hero-empty={wishlistHeroEmpty ? "true" : "false"}
        data-page-hero-loading={wishlistHeroSpinner ? "true" : "false"}
        data-page-hero-ready={wishlistHeroImageReady ? "true" : "false"}
        style={wishlistHeroStyle}
      >
        {wishlistHeroImageLoader ? <PageHeroShellImageLoader /> : null}
        <div className="container">
          <span className="section-label">Saved For Later</span>
          <h1 className={`t-display ${styles.pageTitle}`}>Wishlist</h1>
        </div>
      </div>

      <div className="section">
        <div className="container">
        {items.length === 0 ? (
          <div className={styles.empty}>
            <p>No pieces saved yet.</p>
            <Link href="/shop" className="btn btn-primary" style={{ marginTop: "1.5rem" }}>
              Browse The Shop
            </Link>
          </div>
        ) : (
          <>
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 3vw, 2.5rem)", fontStyle: "italic", fontWeight: 400, letterSpacing: "0.02em", color: "var(--color-text-primary)", textTransform: "lowercase" }}>
                make your wishes come through
              </h2>
            </div>
            <div className={styles.grid}>
              {items.map((item) => {
              const fullProduct = products.find(p => p.id === item.id) || (item as unknown as Product);
              const colorVariants = ((fullProduct as any)?.variants || []).filter((v: any) => v.type === "color");
              const hasColors = colorVariants.length > 0;
              const swatchesToShow = colorVariants.slice(0, 3);
              const totalColors = colorVariants.length;

              return (
              <article key={item.id} className={shopStyles.card}>
                <div className={shopStyles.imageWrapOuter}>
                  <div className={shopStyles.imageWrap}>
                    {item.hoverImage ? (
                    <>
                      <ProductMedia src={item.image} alt={item.name} className={shopStyles.imagePrimary} loading="lazy" />
                      <ProductMedia src={item.hoverImage} alt="" className={shopStyles.imageHover} loading="lazy" aria-hidden />
                    </>
                  ) : (
                    <ProductMedia src={item.image} alt={item.name} className={shopStyles.image} loading="lazy" />
                  )}

                  {hasColors && (
                    <div className={shopStyles.colorIndicatorWrap} aria-label={`${totalColors} colors available`}>
                      {swatchesToShow.map((v: any) => (
                        <div
                          key={v.id}
                          className={shopStyles.colorSwatch}
                          style={{ backgroundColor: v.colorHex || "#ccc", backgroundImage: (v.thumbnailUrl || (v.images && v.images[0]) || (v.id === "main-color" ? item.image : null) || (v.combos && v.combos[0]?.thumbnailUrl) || (v.combos && v.combos[0]?.images?.[0]) || null) ? `url(${v.thumbnailUrl || (v.images && v.images[0]) || (v.id === "main-color" ? item.image : null) || (v.combos && v.combos[0]?.thumbnailUrl) || (v.combos && v.combos[0]?.images?.[0]) || ""})` : "none", backgroundSize: "cover", backgroundPosition: "center" }}
                          aria-hidden="true"
                        />
                      ))}
                      {totalColors > 3 && (
                        <span className={shopStyles.colorCount}>3+</span>
                      )}
                    </div>
                  )}

                                    <div className={shopStyles.overlay}>
                    <div className={shopStyles.actionButtons}>
                      <button 
                        className={shopStyles.iconBtn} 
                        aria-label="Remove from Wishlist" 
                        title="Remove"
                        onClick={() => handleRemove(item.id, item.name)}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                      </button>
                      <button
                        className={shopStyles.iconBtn}
                        aria-label="Quick View"
                        title="Quick View"
                        onClick={() => setQuickViewPiece(fullProduct as Product)}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="6" cy="15" r="4"/><circle cx="18" cy="15" r="4"/><path d="M14 15a2 2 0 0 0-2-2 2 2 0 0 0-2 2"/><path d="M2.5 13 5 7c.7-1.3 1.4-2 3-2"/><path d="M21.5 13 19 7c-.7-1.3-1.5-2-3-2"/>
                        </svg>
                      </button>
                    </div>
                    <div className={shopStyles.pickMeWrap}>
                      <button
                        type="button"
                        className={shopStyles.pickMeBtn}
                        aria-label={`Add ${item.name} to cart`}
                        onClick={() => handleAddToCart(item)}
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>

                <div className={shopStyles.badgeStack} aria-hidden="true">
                  {(() => {
                    const isBespoke = !!(fullProduct.bespokeAvailable && fullProduct.quantity <= 0);
                    return isBespoke ? (
                      <span className={shopStyles.saleBadge} style={{ background: "#595D66" }}>MADE TO ORDER</span>
                    ) : fullProduct.isOutOfStock ? (
                      <span className={shopStyles.saleBadge} style={{ background: "#ef4444" }}>OUT OF STOCK</span>
                    ) : (
                      <>
                        {fullProduct.category === "sample-sale" && (
                          <span className={shopStyles.saleBadge}>SALE</span>
                        )}
                        {fullProduct.isLimited && fullProduct.category !== "sample-sale" && (
                          <span className={shopStyles.saleBadge} style={{ background: "#595D66" }}>LIMITED</span>
                        )}
                        {fullProduct.isBestSeller && (
                          <span className={shopStyles.saleBadge} style={{ background: "#f59e0b" }}>BEST SELLER</span>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
                <div className={shopStyles.info}>
                  <span className={shopStyles.category}>
                    {item.category && item.category.toLowerCase() !== "none" ? item.category : ""}
                  </span>
                  <h2 className={shopStyles.name} style={{ fontSize: item.name.length > 24 ? "0.95rem" : item.name.length > 16 ? "1.1rem" : undefined }}>{item.name}</h2>
                  <div className={shopStyles.priceRow}>
                    <span className={shopStyles.price}>
                      {typeof fullProduct?.price === "number"
                        ? `GHC ${fullProduct.price.toLocaleString()}`
                        : String(item.price).startsWith("GHC")
                        ? item.price
                        : `GHC ${Number(item.price) ? Number(item.price).toLocaleString() : item.price}`}
                    </span>
                  </div>
                </div>
              </article>
              );
            })}
          </div>
          </>
        )}
        </div>
      </div>

      <ProductSuggestions
        suggestedProducts={useMemo(() => {
          if (products.length === 0) return [];
          const pool = [...products];
          for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
          }
          return pool.slice(0, 5);
        }, [products])}
        suggestionPhrase="Discover more"
        setQuickViewPiece={setQuickViewPiece}
        formatPrice={formatPrice}
        marginTop="6rem"
        paddingBottom="4rem"
      />

      {quickViewPiece && (
        <div className={shopStyles.modalBackdrop} onClick={() => setQuickViewPiece(null)} aria-hidden="true">
          <div className={shopStyles.modalContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <button className={shopStyles.modalClose} onClick={() => setQuickViewPiece(null)} aria-label="Close modal">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <div className={shopStyles.modalGrid}>
              {(() => {
                const quickViewStockStatus = getVariantStockStatus(quickViewPiece, quickViewActiveVariant, quickViewActiveCombo, quickViewMode);
                return (
                  <>
              <div className={shopStyles.modalGallery}>
                <div className={shopStyles.modalImageWrap} style={{ position: "relative" }}>

                  <ProductMedia src={activeImage || quickViewGalleryImages[0] || quickViewPiece.image} alt={quickViewPiece.name} className={shopStyles.modalImage} />
                  <div className={shopStyles.badgeStack} aria-hidden="true" style={{ left: "var(--space-md)" }}>
                    {(() => {
                      const isBespoke = quickViewStockStatus.isBespokeProduct;
                      return isBespoke ? (
                        <span className={shopStyles.saleBadge} style={{ background: "#595D66" }}>MADE TO ORDER</span>
                      ) : quickViewStockStatus.isSelectedOutOfStock ? (
                        <span className={shopStyles.saleBadge} style={{ background: "#ef4444" }}>OUT OF STOCK</span>
                      ) : (
                        <>
                          {quickViewPiece.category === "sample-sale" && (
                            <span className={shopStyles.saleBadge}>SALE</span>
                          )}
                          {quickViewPiece.isLimited && quickViewPiece.category !== "sample-sale" && (
                            <span className={shopStyles.saleBadge} style={{ background: "#595D66" }}>LIMITED</span>
                          )}
                          {quickViewPiece.isBestSeller && (
                            <span className={shopStyles.saleBadge} style={{ background: "#f59e0b" }}>BEST SELLER</span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
                {quickViewGalleryImages && quickViewGalleryImages.length > 1 && (
                  <div className={shopStyles.modalThumbnails}>
                    {quickViewGalleryImages.map((img: string, idx: number) => (
                      <button
                        key={idx}
                        className={`${shopStyles.thumbBtn} ${(activeImage || quickViewGalleryImages[0]) === img ? shopStyles.thumbActive : ""}`}
                        onClick={() => setActiveImage(img)}
                        aria-label={`View image ${idx + 1}`}
                      >
                        <ProductMedia src={img} alt={`Thumbnail ${idx + 1}`} className={shopStyles.thumbImage} />
                      </button>
                    ))}
                  </div>
                )}
                {quickViewPiece?.variants?.some((v: any) => v.id === "fit-combo") && quickViewColorVariants.length === 0 && (
                  <div className={shopStyles.comboSelectorSection} style={{ marginTop: "1rem" }}>
                    <span className={shopStyles.colorSelectorLabel} style={{ display: "block", marginBottom: "0.5rem" }}>Fit Combo:</span>
                    <div className={shopStyles.comboToggles} style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem" }}>
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
                      <div className={shopStyles.comboThumbnails} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
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
                    <div className={shopStyles.colorSelectorSection}>
                      <span className={shopStyles.colorSelectorLabel}>Color:</span>
                      <div className={shopStyles.colorSelectorSwatches}>
                        {quickViewColorVariants.map((v: any) => (
                          <button
                            key={v.id}
                            className={`${shopStyles.colorSelectorBtn} ${shopStyles.colorSelectorBtnActive}`}
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
                      <div className={shopStyles.comboSelectorSection} style={{ marginTop: "1rem" }}>
                        <span className={shopStyles.colorSelectorLabel} style={{ display: "block", marginBottom: "0.5rem" }}>Fit Combo:</span>
                        <div className={shopStyles.comboToggles} style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem" }}>
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
                          <div className={shopStyles.comboThumbnails} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
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

              <div className={shopStyles.modalInfo}>
                <h2 id="modal-title" className={`t-display ${shopStyles.modalTitle}`}>
                  {quickViewActiveCombo?.productNameOverride ? quickViewActiveCombo.productNameOverride : (quickViewActiveVariant && quickViewActiveVariant.id !== "main-color" && quickViewActiveVariant.productNameOverride ? quickViewActiveVariant.productNameOverride : quickViewPiece.name)}
                </h2>
                <div className={shopStyles.modalPriceRow}>
                  <span className={shopStyles.modalPrice}>{formatPrice(quickViewActiveCombo ? (quickViewActiveCombo.price || quickViewPiece.price) : quickViewPiece.price)}</span>
                  {!quickViewActiveCombo && (quickViewPiece as any).originalPrice && <span className={shopStyles.modalOriginalPrice}>{formatPrice((quickViewPiece as any).originalPrice)}</span>}
                </div>

                <p className={shopStyles.modalDesc}>{quickViewPiece.description}</p>

                {(quickViewPiece.wearTag === "womens" || quickViewPiece.wearTag === "unisex") && (
                  <div className={shopStyles.modalSizeRow} style={{ marginBottom: "1rem" }}>
                    <span className={shopStyles.qtyLabel}>{quickViewPiece.wearTag === "unisex" ? "Gender:" : "Fit:"}</span>
                    <div className={shopStyles.modalFitSelector}>
                      {(quickViewPiece.wearTag === "unisex" ? ["Men", "Women"] : ["Standard", "Thick"]).map((fit) => (
                        <button
                          key={fit}
                          className={`${shopStyles.fitBtn} ${quickViewFit === fit ? shopStyles.fitBtnActive : ""}`}
                          onClick={() => { setQuickViewFit(fit); setQuickViewSize(""); }}
                        >
                          {fit}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className={shopStyles.modalSizeRow}>
                  <span className={shopStyles.qtyLabel}>Size:</span>
                  <div className={shopStyles.sizeGrid}>
                    {getAvailableSizes(quickViewPiece, quickViewFit).map((sz: string) => (
                      <button
                        key={sz}
                        className={`${shopStyles.sizeBtn} ${quickViewSize === sz ? shopStyles.sizeActive : ""}`}
                        onClick={() => setQuickViewSize(prev => prev === sz ? "" : sz)}
                      >
                        {formatSizeLabel(sz, quickViewFit, quickViewPiece.wearTag)}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={shopStyles.sizeGuideBtn}
                    onClick={() => setSizeGuideOpen(true)}
                  >
                    Size Guide
                  </button>
                </div>
                {quickViewSize === "Custom" && (
                  <p className={shopStyles.customNotice}>
                    Custom sizing selected. We will contact you for measurements after checkout.
                  </p>
                )}

                {(() => {
                  const isBespoke = quickViewStockStatus.isBespokeProduct;
                  return !isBespoke && quickViewStockStatus.isSelectedOutOfStock ? (
                    <p className={shopStyles.customNotice} style={{ color: "#c00", background: "#fee" }}>
                      This item is currently out of stock.
                    </p>
                  ) : null;
                })()}

                <div className={shopStyles.modalQtyRow}>
                  <div className={shopStyles.qtyLeft}>
                    <span className={shopStyles.qtyLabel}>Quantity:</span>
                    <div className={shopStyles.qtyControl}>
                      <button className={shopStyles.qtyBtn} onClick={() => setQty(Math.max(1, qty - 1))}>-</button>
                      <span className={shopStyles.qtyVal}>{qty}</span>
                      <button 
                        className={shopStyles.qtyBtn} 
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
                    <span className={shopStyles.lowStockWarning}>Only {quickViewPiece.quantity} left</span>
                  )}
                </div>

                <div className={shopStyles.modalActions}>
                  {(() => {
                    const isBespoke = quickViewStockStatus.isBespokeProduct;
                    return (
                      <button
                        className={`btn btn-primary ${shopStyles.modalAddBtn}`}
                        onClick={handleAddToCartQuick}
                        disabled={(quickViewStockStatus.isSelectedOutOfStock && !isBespoke) || quickAddStatus !== "idle"}
                        style={{ transition: "all 0.3s ease" }}
                      >
                        {quickViewStockStatus.isSelectedOutOfStock && !isBespoke
                          ? "Out of Stock"
                          : isBespoke
                            ? (quickAddStatus === "idle" ? "Order Made to Order" : quickAddStatus === "adding" ? "Adding..." : "Added ✓")
                            : (quickAddStatus === "idle" ? "Add To Cart" : quickAddStatus === "adding" ? "Adding..." : "Added ✓")}
                      </button>
                    );
                  })()}
                  <button
                    className={shopStyles.modalWishlistBtn}
                    onClick={() => {
                      if (wishlistStore.has(quickViewPiece.id)) {
                        wishlistStore.removeItem(quickViewPiece.id);
                        toast.success(`${quickViewPiece.name} removed from wishlist`);
                      } else {
                        wishlistStore.addItem({
                          id: quickViewPiece.id,
                          name: quickViewPiece.name,
                          price: formatPrice(quickViewPiece.price),
                          image: quickViewPiece.image,
                          hoverImage: quickViewPiece.hoverImage,
                          category: quickViewPiece.category || "Shop"
                        });
                        toast.success(`${quickViewPiece.name} added to wishlist`);
                      }
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={wishlistStore.has(quickViewPiece.id) ? "var(--alaska-gray)" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" suppressHydrationWarning>
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    {wishlistStore.has(quickViewPiece.id) ? "Saved To Wishlist" : "Add To Wishlist"}
                  </button>
                </div>

                {(() => {
                  const isBespoke = quickViewStockStatus.isBespokeProduct;
                  return isBespoke ? (
                    <div role="status" aria-live="polite" style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "14px", marginBottom: "2px", fontSize: "0.78rem", color: "var(--alaska-gray)", whiteSpace: "nowrap" }}>
                      <Clock aria-hidden style={{ flex: "0 0 auto", opacity: 0.85, width: "14px", height: "14px", color: "var(--alaska-gray)" }} />
                      <span>
                        Made to Order piece handcrafted for you within {quickViewStockStatus.bespokeLeadDays || 14} days
                      </span>
                    </div>
                  ) : null;
                })()}

                <div className={shopStyles.modalMeta}>
                  {(() => {
                    const colName = quickViewPiece.category;
                    return colName && colName.toLowerCase() !== "none" ? <p><span>Category:</span> {colName}</p> : null;
                  })()}
                </div>
                <Link href={`/shop/${quickViewPiece.slug || quickViewPiece.id}`} className={shopStyles.modalFullDetail} onClick={() => setQuickViewPiece(null)}>
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
      
      <SizeGuideModal 
        open={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
        kind={sizeGuideKind}
      />
    </div>
  );
}