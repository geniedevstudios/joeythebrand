"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useSyncExternalStore, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { wishlistStore } from "@/store/wishlistStore";
import { dataStore, DEFAULT_SIZES, WOMENS_DEFAULT_SIZES } from "@/lib/dataStore";
import { PAGE_HERO_SHELL_CLASS, usePageHeroShellRenderProps } from "@/hooks/usePageHero";
import { useStoreLoading } from "@/hooks/useStoreLoading";
import ProductMedia from "@/components/shop/ProductMedia";
import PageHeroShellImageLoader from "@/components/page-hero/PageHeroShellImageLoader";
import SizeGuideModal, { type SizeGuideKind } from "@/components/SizeGuideModal";
import ProductSuggestions from "@/components/shop/ProductSuggestions";
import { formatSizeLabel } from "@/lib/formatSizeLabel";
import { getVariantStockStatus, getIsSoloUnavailable } from "@/lib/variantUtils";
import styles from "./ProductClient.module.css";
import shopStyles from "../ShopClient.module.css";
const EMPTY_ARRAY: any[] = [];
const _getEmptyArray = () => EMPTY_ARRAY;
const _getProducts = () => dataStore.getProducts();
const _getWishlistItems = () => wishlistStore.getItems();

function ProductDetailSkeletonBody() {
  return (
    <>
      <div className="container" style={{ paddingTop: "2rem" }}>
        <div className={styles.layout}>
          {/* Gallery column */}
          <div className={styles.galleryCol}>
            <div
              className={`${styles.mainImageWrap} skeleton`}
              style={{ aspectRatio: "3/4", width: "100%", borderRadius: 8 }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="skeleton"
                  style={{ width: 72, height: 72, borderRadius: 6, flexShrink: 0 }}
                />
              ))}
            </div>
          </div>
          {/* Info column */}
          <div className={styles.infoCol}>
            <div className={styles.infoSticky}>
              <div className="skeleton" style={{ height: 14, width: "35%", marginBottom: 16 }} />
              <div className="skeleton" style={{ height: 52, width: "80%", marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 28, width: "40%", marginBottom: 24 }} />
              <div className={styles.divider} style={{ marginBottom: 24 }} />
              <div className="skeleton" style={{ height: 14, width: "100%", marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 14, width: "85%", marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 14, width: "70%", marginBottom: 32 }} />
              <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
                {["XS","S","M","L","XL","Custom"].map((s) => (
                  <div key={s} className="skeleton" style={{ width: 48, height: 40, borderRadius: 6 }} />
                ))}
              </div>
              <div className="skeleton" style={{ height: 54, width: "100%", borderRadius: 9999, marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 54, width: "100%", borderRadius: 9999 }} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

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

export default function ProductClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedFit, setSelectedFit] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [addStatus, setAddStatus] = useState<"idle" | "adding" | "added">("idle");
  const [activeImage, setActiveImage] = useState<string>("");
  const [activeColorVariantId, setActiveColorVariantId] = useState<string>("main-color");
  const [activeMode, setActiveMode] = useState<"solo" | "paired">("solo");
  const [activeComboId, setActiveComboId] = useState<string>("");
  const [quickViewItem, setQuickViewItem] = useState<any>(null);
  const [quickViewSize, setQuickViewSize] = useState("");
  const [quickViewFit, setQuickViewFit] = useState("");
  const [quickViewImage, setQuickViewImage] = useState("");
  const [quickViewColorVariantId, setQuickViewColorVariantId] = useState<string>("main-color");
  const [quickViewMode, setQuickViewMode] = useState<"solo" | "paired">("solo");
  const [quickViewComboId, setQuickViewComboId] = useState<string>("");
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  const products = useSyncExternalStore(dataStore.subscribe, _getProducts, _getEmptyArray);
  const collections = useSyncExternalStore(dataStore.subscribe, dataStore.getCollections, () => []);
  const wishlistItems = useSyncExternalStore(wishlistStore.subscribe, _getWishlistItems, _getEmptyArray);
  const isStoreLoading = useStoreLoading();
  const isInWishlist = (itemId: string) => wishlistItems.some(item => item.id === itemId);

  const product = products.find((p: any) => p.slug === slug || p.id === slug);

  // Set default fit when product loads
  useEffect(() => {
    if (product?.wearTag === "womens") {
      setSelectedFit("Standard");
    } else if (product?.wearTag === "unisex") {
      setSelectedFit("Men");
    }
  }, [product]);

  useEffect(() => {
    if (quickViewItem?.wearTag === "womens") {
      setQuickViewFit("Standard");
    } else if (quickViewItem?.wearTag === "unisex") {
      setQuickViewFit("Men");
    }
    setQuickViewColorVariantId("main-color");
    setQuickViewMode("solo");
    setQuickViewComboId("");
  }, [quickViewItem]);

  const getCollectionName = useMemo(() => {
    return (p: any): string => {
      const slug = String(p?.category || "").trim();
      if (!slug || slug === "none") return "";
      const match = (collections as any[]).find((c: any) => c?.slug === slug);
      return match?.name ? String(match.name) : "";
    };
  }, [collections]);

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

  const sizeGuideKind: SizeGuideKind = useMemo(() => {
    const w = String((quickViewItem ?? product)?.wearTag ?? "").toLowerCase();
    if (w === "mens") return "mens";
    if (w === "womens") return "womens";
    if (w === "unisex") return "unisex";
    return "both";
  }, [product, quickViewItem]);

  // Escape handling is inside SizeGuideModal.

  const colorVariants = useMemo(() => {
    if (!product || !product.variants) return [];
    return product.variants.filter((v: any) => v.type === "color");
  }, [product]);

  const activeColorVariant = useMemo(() => {
    return colorVariants.find((v: any) => v.id === activeColorVariantId);
  }, [colorVariants, activeColorVariantId]);

  const activeCombo = useMemo(() => {
    if (activeMode !== "paired" || !activeComboId) return null;
    if (activeComboId === "fit-combo") {
      return product?.variants?.find((v: any) => v.id === "fit-combo") || null;
    }
    return activeColorVariant?.combos?.find((c: any) => c.id === activeComboId) || null;
  }, [activeMode, activeComboId, activeColorVariant, product]);

  const galleryImages = useMemo(() => {
    if (!product) return EMPTY_ARRAY;
    
    let imagesToUse = product.images || [];

    if (activeCombo && activeCombo.images && activeCombo.images.length > 0) {
      imagesToUse = activeCombo.images;
    } else if (activeColorVariant && activeColorVariant.id !== "main-color" && activeColorVariant.images && activeColorVariant.images.length > 0) {
      imagesToUse = activeColorVariant.images;
    } else if (activeColorVariant && activeColorVariant.id !== "main-color" && activeColorVariant.combos && activeColorVariant.combos[0]?.images?.length > 0) {
      imagesToUse = activeColorVariant.combos[0].images;
    }

    return imagesToUse.filter((img: string) => img && img.trim() !== "" && img !== product.hoverImage);
  }, [product, activeColorVariant, activeCombo]);

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
  }, [product, products]);

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

  const quickViewColorVariants = useMemo(() => {
    if (!quickViewItem || !quickViewItem.variants) return [];
    return quickViewItem.variants.filter((v: any) => v.type === "color");
  }, [quickViewItem]);

  const quickViewActiveColorVariant = useMemo(() => {
    return quickViewColorVariants.find((v: any) => v.id === quickViewColorVariantId);
  }, [quickViewColorVariants, quickViewColorVariantId]);

  const quickViewActiveCombo = useMemo(() => {
    if (quickViewMode !== "paired" || !quickViewComboId || !quickViewActiveColorVariant?.combos) return null;
    return quickViewActiveColorVariant.combos.find((c: any) => c.id === quickViewComboId);
  }, [quickViewMode, quickViewComboId, quickViewActiveColorVariant]);

  const quickViewGalleryImages = useMemo(() => {
    if (!quickViewItem) return [];
    let imagesToUse = quickViewItem.images || [];

    if (quickViewActiveCombo && quickViewActiveCombo.images && quickViewActiveCombo.images.length > 0) {
      imagesToUse = quickViewActiveCombo.images;
    } else if (quickViewActiveColorVariant && quickViewActiveColorVariant.id !== "main-color" && quickViewActiveColorVariant.images && quickViewActiveColorVariant.images.length > 0) {
      imagesToUse = quickViewActiveColorVariant.images;
    }
    return imagesToUse.filter((img: string) => img !== quickViewItem.hoverImage);
  }, [quickViewItem, quickViewActiveColorVariant, quickViewActiveCombo]);

  const formatPrice = (price: number | string) => {
    if (typeof price === "string") return price;
    return `GHC ${price.toLocaleString()}`;
  };
  const {
    empty: productHeroEmpty,
    shellSpinner: productHeroSpinner,
    style: productHeroStyle,
    showImageLoader: productHeroImageLoader,
    imageReady: productHeroImageReady,
  } = usePageHeroShellRenderProps("product");

  const productHeroBanner = (
    <div className={styles.heroBanner}>
      <div
        className={`${PAGE_HERO_SHELL_CLASS} ${styles.heroBannerBg}`}
        data-page-hero-empty={productHeroEmpty ? "true" : "false"}
        data-page-hero-loading={productHeroSpinner ? "true" : "false"}
        data-page-hero-ready={productHeroImageReady ? "true" : "false"}
        style={productHeroStyle}
      >
        {productHeroImageLoader ? <PageHeroShellImageLoader /> : null}
        {/* Keep route-specific scrim consistent with other headers. */}
        {!productHeroEmpty ? <div className={styles.heroBannerOverlay} /> : null}
      </div>
    </div>
  );

  if (!product) {
    if (isStoreLoading || products.length === 0) {
      return (
        <div className={styles.page}>
          {productHeroBanner}
          <ProductDetailSkeletonBody />
        </div>
      );
    }
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

  const currentCombo = activeCombo;
  const currentColor = activeColorVariant;

  const colorBespokeAvailable = currentColor?.bespokeAvailable ?? (currentColor?.combos?.length > 0 ? currentColor.combos.some((c: any) => c.bespokeAvailable) : product.bespokeAvailable);
  const parentOutOfStock = product.isOutOfStock || (typeof product.quantity === "number" ? product.quantity <= 0 : !!product.bespokeAvailable);
  const isComboOutOfStock = currentCombo?.isOutOfStock || (typeof currentCombo?.quantity === "number" ? currentCombo.quantity <= 0 : !!currentCombo?.bespokeAvailable);
  const isColorOutOfStock = currentColor?.isOutOfStock || (typeof currentColor?.quantity === "number" ? currentColor.quantity <= 0 : (currentColor?.combos?.length > 0 && colorBespokeAvailable ? true : parentOutOfStock));
  const isSelectedOutOfStock = activeMode === "paired" && currentCombo
    ? isComboOutOfStock
    : (activeMode === "solo" && currentColor?.id !== "main-color" ? isColorOutOfStock : product.isOutOfStock);

  const isSelectedBespokeAvailable = activeMode === "paired" && currentCombo
    ? currentCombo.bespokeAvailable ?? product.bespokeAvailable
    : (activeMode === "solo" && currentColor?.id !== "main-color" ? colorBespokeAvailable : product.bespokeAvailable);

  const isBespokeProduct = !!(isSelectedBespokeAvailable && isSelectedOutOfStock);
  const currentMaxStock = isBespokeProduct ? 999 : (activeMode === "paired" && currentCombo && typeof currentCombo.quantity === "number" ? currentCombo.quantity : (activeMode === "solo" && currentColor?.id !== "main-color" && typeof currentColor?.quantity === "number" ? currentColor.quantity : product.quantity));
  const currentBespokeLeadDays = activeMode === "paired" && currentCombo && currentCombo.bespokeAvailable
    ? currentCombo.bespokeLeadDays ?? product.bespokeLeadDays ?? 14
    : (activeMode === "solo" && currentColor?.id !== "main-color" && currentColor?.bespokeAvailable ? currentColor.bespokeLeadDays ?? product.bespokeLeadDays ?? 14 : product.bespokeLeadDays ?? 14);

  const handleAddToCart = () => {
    if (!selectedSize && (product.sizes?.length ?? 0) > 0) {
      toast.error("Please pick a size before adding to cart.");
      return;
    }
    
    setAddStatus("adding");

    setTimeout(() => {
      import("@/store/cartStore").then(({ cartStore }) => {
        cartStore.addItem({
          productId: product.id,
          name: activeCombo?.productNameOverride ? activeCombo.productNameOverride : (activeColorVariant?.id !== "main-color" && activeColorVariant?.productNameOverride ? activeColorVariant.productNameOverride : product.name),
          color: activeColorVariant?.id !== "main-color" ? activeColorVariant?.name : undefined,
          colorHex: activeColorVariant?.colorHex,
          combo: activeCombo ? activeCombo.name : undefined,
          size: selectedSize || "Standard",
          fit: (product.wearTag === "womens" || product.wearTag === "unisex") ? selectedFit : undefined,
          wearTag: product.wearTag,
          price: activeCombo ? (activeCombo.price || product.price) : product.price,
          image: activeCombo?.thumbnailUrl || galleryImages[0] || product.image,
          image2: activeCombo?.images?.[0] || galleryImages[1] || product.images?.[0],
          quantity: qty,
          maxStock: currentMaxStock,
          isBespoke: isBespokeProduct || undefined,
          bespokeLeadDays: isBespokeProduct ? currentBespokeLeadDays : undefined,
          variantId: activeColorVariant?.id !== "main-color" ? activeColorVariant?.id : undefined,
          comboId: activeCombo ? activeCombo.id : undefined,
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
      {productHeroBanner}

      <div className={styles.breadcrumbs}>
        <div className="container">
          <button
            type="button"
            className={`${styles.crumbLink} ${styles.crumbBackBtn}`}
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push("/shop");
              }
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={styles.crumbBackIcon}
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back
          </button>
        </div>
      </div>

      <div className="container">
        <div className={styles.layout}>
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
            {isBespokeProduct && (
              <div style={{ 
                writingMode: "vertical-rl", 
                transform: "rotate(180deg)", 
                background: "#8b5cf6", 
                color: "#fff", 
                fontFamily: "var(--font-label)", 
                fontSize: "0.75rem", 
                letterSpacing: "0.12em", 
                padding: "16px 8px", 
                borderRadius: "var(--radius-full)", 
                display: "inline-flex", 
                alignItems: "center",
                whiteSpace: "nowrap",
                marginTop: "16px",
                flexShrink: 0
              }}>
                BESPOKE ORDER
              </div>
            )}
            <div className={styles.galleryCol} style={{ flex: 1, minWidth: 0 }}>
              <div className={styles.mainImageWrap}>
                <ProductMedia 
                  src={activeImage || galleryImages[0] || product.image} 
                  alt={product.name} 
                  className={styles.mainImage} 
                />
                <div className={styles.badgeStack} aria-hidden="true">
                  {!isBespokeProduct && (
                    isSelectedOutOfStock ? (
                      <span className={styles.saleBadge} style={{ background: "#ef4444" }}>OUT OF STOCK</span>
                    ) : (
                      <>
                        {product.category === "sample-sale" && (
                          <span className={styles.saleBadge}>SALE</span>
                        )}
                        {product.isLimited && product.category !== "sample-sale" && (
                          <span className={styles.saleBadge} style={{ background: "#8b5cf6" }}>LIMITED</span>
                        )}
                        {product.isBestSeller && (
                          <span className={styles.saleBadge} style={{ background: "#f59e0b" }}>BEST SELLER</span>
                        )}
                      </>
                    )
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
                    <ProductMedia src={img} alt={`${product.name} view ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}

            {colorVariants.length > 0 && (
              <div className={styles.colorSelectorSection}>
                <span className={styles.colorSelectorLabel}>Color:</span>
                <div className={styles.colorSelectorSwatches}>
                  {colorVariants.map((v: any) => (
                    <button
                      key={v.id}
                      className={`${styles.colorSelectorBtn} ${activeColorVariantId === v.id ? styles.colorSelectorBtnActive : ""}`}
                      style={{ 
                        backgroundColor: v.colorHex || "#ccc", backgroundImage: (v.thumbnailUrl || (v.images && v.images[0]) || (v.id === "main-color" ? product.image : null) || (v.combos && v.combos[0]?.thumbnailUrl) || (v.combos && v.combos[0]?.images?.[0]) || null) ? `url(${v.thumbnailUrl || (v.images && v.images[0]) || (v.id === "main-color" ? product.image : null) || (v.combos && v.combos[0]?.thumbnailUrl) || (v.combos && v.combos[0]?.images?.[0]) || ""})` : "none", backgroundSize: "cover", backgroundPosition: "center", 
                        opacity: (v.isOutOfStock || (typeof v.quantity === "number" && v.quantity <= 0)) ? 0.4 : 1,
                        textDecoration: (v.isOutOfStock || (typeof v.quantity === "number" && v.quantity <= 0)) ? "line-through" : "none"
                      }}
                      onClick={() => {
                        setActiveColorVariantId(v.id);
                        const isSoloUnavailable = v.isOutOfStock || (typeof v.quantity === "number" ? v.quantity <= 0 : !!v.bespokeAvailable);
                        const hasCombos = v.combos && v.combos.length > 0;
                        if (isSoloUnavailable && hasCombos) {
                          setActiveMode("paired");
                          setActiveComboId(v.combos[0].id);
                        } else if (activeMode === "paired" && hasCombos) {
                          setActiveComboId(v.combos[0].id);
                        }
                      }}
                      aria-label={`Select color ${v.colorHex}`}
                      title={v.name || "Color"}
                    />
                  ))}
                </div>
              </div>
            )}

            {activeColorVariant && activeColorVariant.combos && activeColorVariant.combos.length > 0 && (
                  <div className={styles.comboSelectorSection} style={{ marginTop: "1rem" }}>
                    <span className={styles.colorSelectorLabel} style={{ display: "block", marginBottom: "0.5rem" }}>Fit Combo:</span>
                    <div className={styles.comboToggles} style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem" }}>
                      <button
                        type="button"
                        onClick={() => { setActiveMode("solo"); setActiveComboId(""); }}
                        style={{ 
                          padding: "0.25rem 0", 
                          borderBottom: activeMode === "solo" ? "2px solid #000" : "2px solid transparent",
                          color: activeMode === "solo" ? "#000" : "#888",
                          fontWeight: activeMode === "solo" ? 600 : 400,
                          background: "none", borderTop: "none", borderLeft: "none", borderRight: "none", cursor: "pointer"
                        }}
                      >
                        Original
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveMode("paired")}
                        style={{ 
                          padding: "0.25rem 0", 
                          borderBottom: activeMode === "paired" ? "2px solid #000" : "2px solid transparent",
                          color: activeMode === "paired" ? "#000" : "#888",
                          fontWeight: activeMode === "paired" ? 600 : 400,
                          background: "none", borderTop: "none", borderLeft: "none", borderRight: "none", cursor: "pointer"
                        }}
                      >
                        Options
                      </button>
                    </div>
                    
                    {activeMode === "paired" && (
                      <div className={styles.comboThumbnails} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        {activeColorVariant.combos.map((combo: any) => (
                          <button
                            key={combo.id}
                            onClick={() => setActiveComboId(combo.id)}
                            style={{
                              width: "48px", height: "48px", borderRadius: "4px", overflow: "hidden",
                              border: activeComboId === combo.id ? "2px solid #000" : "1px solid #e5e5e5",
                              padding: 0, background: "none", cursor: "pointer", position: "relative",
                              opacity: (combo.isOutOfStock || (typeof combo.quantity === "number" && combo.quantity <= 0)) ? 0.4 : 1
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

            {product.variants?.some((v: any) => v.id === "fit-combo") && colorVariants.length === 0 && (
              <div className={styles.comboSelectorSection} style={{ marginTop: "1rem" }}>
                <span className={styles.colorSelectorLabel} style={{ display: "block", marginBottom: "0.5rem" }}>Fit Combo:</span>
                <div className={styles.comboToggles} style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem" }}>
                  <button
                    type="button"
                    onClick={() => { setActiveMode("solo"); setActiveComboId(""); }}
                    style={{ 
                      padding: "0.25rem 0", 
                      borderBottom: activeMode === "solo" ? "2px solid #000" : "2px solid transparent",
                      color: activeMode === "solo" ? "#000" : "#888",
                      fontWeight: activeMode === "solo" ? 600 : 400,
                      background: "none", borderTop: "none", borderLeft: "none", borderRight: "none", cursor: "pointer"
                    }}
                  >
                        Original
                      </button>
                  <button
                    type="button"
                    onClick={() => { setActiveMode("paired"); setActiveComboId("fit-combo"); }}
                    style={{ 
                      padding: "0.25rem 0", 
                      borderBottom: activeMode === "paired" ? "2px solid #000" : "2px solid transparent",
                      color: activeMode === "paired" ? "#000" : "#888",
                      fontWeight: activeMode === "paired" ? 600 : 400,
                      background: "none", borderTop: "none", borderLeft: "none", borderRight: "none", cursor: "pointer"
                    }}
                  >
                        Options
                      </button>
                </div>
                
                {activeMode === "paired" && (
                  <div className={styles.comboThumbnails} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button
                      onClick={() => setActiveComboId("fit-combo")}
                      style={{
                        width: "48px", height: "48px", borderRadius: "4px", overflow: "hidden",
                        border: activeComboId === "fit-combo" ? "2px solid #000" : "1px solid #e5e5e5",
                        padding: 0, background: "none", cursor: "pointer", position: "relative"
                      }}
                      title={product.variants.find((v: any) => v.id === "fit-combo")?.name || "Fit Combo"}
                    >
                      {product.variants.find((v: any) => v.id === "fit-combo")?.thumbnailUrl ? (
                        <img src={product.variants.find((v: any) => v.id === "fit-combo").thumbnailUrl} alt="Thumbnail" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>
                          {(product.variants.find((v: any) => v.id === "fit-combo")?.name || "Fit Combo").slice(0, 2)}
                        </div>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          </div>

          <div className={styles.infoCol}>
            <div className={styles.infoSticky}>
              {(() => {
                const colName = getCollectionName(product);
                return colName ? <span className={styles.categoryLabel}>{colName}</span> : null;
              })()}
              <h1 className={`t-display ${styles.productName}`}>
                {activeCombo?.productNameOverride ? activeCombo.productNameOverride : (activeColorVariant && activeColorVariant.id !== "main-color" && activeColorVariant.productNameOverride ? activeColorVariant.productNameOverride : product.name)}
              </h1>
              
              <div className={styles.priceRow}>
                <span className={styles.price}>
                  {formatPrice(activeCombo ? (activeCombo.price || product.price) : product.price)}
                </span>
                {!activeCombo && product.originalPrice && <span className={styles.originalPrice}>{formatPrice(product.originalPrice)}</span>}
              </div>

              <div className={styles.divider} />

              <div className={styles.description}>
                <p>{product.description}</p>
              </div>

              {product.wearTag === "womens" && (
                <div className={styles.sizeSection} style={{ marginBottom: "1.5rem" }}>
                  <div className={styles.sizeHeader}>
                    <span className={styles.sizeLabel}>Fit</span>
                  </div>
                  <div className={styles.sizeGrid}>
                    {["Standard", "Thick"].map((fit) => (
                      <button
                        key={fit}
                        onClick={() => { setSelectedFit(fit); setSelectedSize(""); }}
                        className={`${styles.sizeBtn} ${selectedFit === fit ? styles.sizeBtnActive : ""}`}
                        aria-pressed={selectedFit === fit}
                        style={{ flex: 1 }}
                      >
                        {fit} Fit
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {product.wearTag === "unisex" && (
                <div className={styles.sizeSection} style={{ marginBottom: "1.5rem" }}>
                  <div className={styles.sizeHeader}>
                    <span className={styles.sizeLabel}>Gender / Fit</span>
                  </div>
                  <div className={styles.sizeGrid}>
                    {["Men", "Women"].map((fit) => (
                      <button
                        key={fit}
                        onClick={() => { setSelectedFit(fit); setSelectedSize(""); }}
                        className={`${styles.sizeBtn} ${selectedFit === fit ? styles.sizeBtnActive : ""}`}
                        aria-pressed={selectedFit === fit}
                        style={{ flex: 1 }}
                      >
                        {fit}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.sizeSection}>
                <div className={styles.sizeHeader}>
                  <span className={styles.sizeLabel}>Size</span>
                  <button
                    type="button"
                    className={styles.sizeGuideBtn}
                    onClick={() => setSizeGuideOpen(true)}
                  >
                    Size Guide
                  </button>
                </div>
                <div className={styles.sizeGrid}>
                  {getAvailableSizes(product, selectedFit).map((size: string) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(prev => prev === size ? "" : size)}
                      className={`${styles.sizeBtn} ${selectedSize === size ? styles.sizeBtnActive : ""}`}
                      aria-pressed={selectedSize === size}
                    >
                      {formatSizeLabel(size, selectedFit, product.wearTag)}
                    </button>
                  ))}
                </div>
                {selectedSize === "Custom" && (
                  <p className={styles.customNotice}>
                    Custom sizing selected. We will contact you for measurements after checkout.
                  </p>
                )}
              </div>

              {isBespokeProduct ? (
                <p className={styles.customNotice} style={{ color: "#5b21b6", background: "#f5f3ff", marginTop: "12px" }}>
                  🧵 This piece is bespoke. Expect approximately {currentBespokeLeadDays} days for production after your order is confirmed.
                </p>
              ) : isSelectedOutOfStock ? (
                <p className={styles.customNotice} style={{ color: "#c00", background: "#fee", marginTop: "12px" }}>
                  This item is currently out of stock.
                </p>
              ) : null}

              <div className={styles.qtySection}>
                <div className={styles.qtyHeader}>
                  <span className={styles.qtyLabel}>Quantity</span>
                </div>
                <div className={styles.qtyControl}>
                  <button className={styles.qtyBtn} onClick={() => setQty(Math.max(1, qty - 1))}>-</button>
                  <span className={styles.qtyVal}>{qty}</span>
                  <button 
                    className={styles.qtyBtn} 
                    onClick={() => {
                      if (isBespokeProduct || qty < currentMaxStock) {
                        setQty(qty + 1);
                      } else {
                        toast.error(`Only ${currentMaxStock} items available in stock.`);
                      }
                    }}
                    disabled={!isBespokeProduct && qty >= currentMaxStock}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className={styles.actions}>
                <div className={styles.actionBtns}>
                  <button 
                    className="btn btn-primary btn-lg" 
                    onClick={handleAddToCart}
                    disabled={addStatus !== "idle" || (isSelectedOutOfStock && !isBespokeProduct)}
                  >
                    {isSelectedOutOfStock && !isBespokeProduct
                      ? "Out of Stock"
                      : isBespokeProduct
                        ? (addStatus === "idle" ? "Order Bespoke" : addStatus === "adding" ? "Adding..." : "Added ✓")
                        : (addStatus === "idle" ? "Add To Cart" : addStatus === "adding" ? "Adding..." : "Added ✓")}
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

                {isBespokeProduct ? (
                  <div className={styles.lowStockNotice} role="status" aria-live="polite" style={{ background: "#f5f3ff", borderColor: "#c4b5fd" }}>
                    <Clock className={styles.lowStockIcon} aria-hidden style={{ color: "#7c3aed" }} />
                    <span style={{ color: "#5b21b6" }}>
                      bespoke piece would be handcrafted for you within {currentBespokeLeadDays} days
                    </span>
                  </div>
                ) : typeof currentMaxStock === "number" &&
                currentMaxStock > 0 &&
                currentMaxStock <= 5 &&
                !isSelectedOutOfStock ? (
                  <div className={styles.lowStockNotice} role="status" aria-live="polite">
                    <Clock className={styles.lowStockIcon} aria-hidden />
                    <span>
                      Only {currentMaxStock} left in stock. Order soon.
                    </span>
                  </div>
                ) : null}

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
                    <h3 className={styles.detailHeading}>Care Guide</h3>
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

        <ProductSuggestions
          suggestedProducts={suggestedProducts}
          suggestionPhrase={suggestionPhrase}
          setQuickViewPiece={(item) => { setQuickViewItem(item); setQuickViewSize(""); setQuickViewImage(item.image); }}
          formatPrice={formatPrice}
        />
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
              <div className={styles.modalImageWrap} style={{ position: "relative" }}>
                <ProductMedia src={quickViewImage || quickViewItem.image} alt={quickViewItem.name} className={styles.modalImage} />
                <div className={shopStyles.badgeStack} aria-hidden="true" style={{ left: "var(--space-md)" }}>
                  {(() => {
                    const isBespoke = !!(quickViewItem.bespokeAvailable && quickViewItem.quantity <= 0);
                    return isBespoke ? (
                      <span className={shopStyles.saleBadge} style={{ background: "#8b5cf6" }}>BESPOKE ORDER</span>
                    ) : quickViewItem.isOutOfStock ? (
                      <span className={shopStyles.saleBadge} style={{ background: "#ef4444" }}>OUT OF STOCK</span>
                    ) : (
                      <>
                        {quickViewItem.category === "sample-sale" && (
                          <span className={shopStyles.saleBadge}>SALE</span>
                        )}
                        {quickViewItem.isLimited && quickViewItem.category !== "sample-sale" && (
                          <span className={shopStyles.saleBadge} style={{ background: "#8b5cf6" }}>LIMITED</span>
                        )}
                        {quickViewItem.isBestSeller && (
                          <span className={shopStyles.saleBadge} style={{ background: "#f59e0b" }}>BEST SELLER</span>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
              {quickViewGalleryImages.length > 1 && (
                <div className={styles.modalThumbnails}>
                  {quickViewGalleryImages.map((img: string, idx: number) => (
                    <button 
                      key={idx} 
                      className={`${styles.thumbBtn} ${(quickViewImage || quickViewItem.image) === img ? styles.thumbActive : ""}`}
                      aria-label={`Thumbnail ${idx + 1}`}
                      onClick={() => setQuickViewImage(img)}
                    >
                      <ProductMedia src={img} alt={`Thumbnail ${idx + 1}`} className={styles.thumbImage} />
                    </button>
                  ))}
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
                          className={`${shopStyles.colorSelectorBtn} ${quickViewColorVariantId === v.id ? shopStyles.colorSelectorBtnActive : ""}`}
                          style={{ backgroundColor: v.colorHex || "#ccc", backgroundImage: (v.thumbnailUrl || (v.images && v.images[0]) || (v.id === "main-color" ? product.image : null) || (v.combos && v.combos[0]?.thumbnailUrl) || (v.combos && v.combos[0]?.images?.[0]) || null) ? `url(${v.thumbnailUrl || (v.images && v.images[0]) || (v.id === "main-color" ? product.image : null) || (v.combos && v.combos[0]?.thumbnailUrl) || (v.combos && v.combos[0]?.images?.[0]) || ""})` : "none", backgroundSize: "cover", backgroundPosition: "center" }}
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
                            if (v.images && v.images.length > 0) {
                              setQuickViewImage(v.images[0]);
                            } else {
                              setQuickViewImage(quickViewItem.image);
                            }
                          }}
                          aria-label={`Select color ${v.id}`}
                          title={v.name || "Color"}
                        />
                      ))}
                    </div>
                  </div>

                  {quickViewActiveColorVariant && quickViewActiveColorVariant.combos && quickViewActiveColorVariant.combos.length > 0 && (
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
                          onClick={() => setQuickViewMode("paired")}
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
                          {quickViewActiveColorVariant.combos.map((combo: any) => (
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
              <h3 className={styles.modalTitle}>
                {quickViewActiveCombo?.productNameOverride ? quickViewActiveCombo.productNameOverride : (quickViewActiveColorVariant && quickViewActiveColorVariant.id !== "main-color" && quickViewActiveColorVariant.productNameOverride ? quickViewActiveColorVariant.productNameOverride : quickViewItem.name)}
              </h3>
              <div className={styles.modalPriceRow}>
                <span className={styles.modalPrice}>
                  {formatPrice(quickViewActiveCombo ? (quickViewActiveCombo.price || quickViewItem.price) : quickViewItem.price)}
                </span>
                {!quickViewActiveCombo && quickViewItem.originalPrice && <span className={styles.modalOriginalPrice}>{formatPrice(quickViewItem.originalPrice)}</span>}
              </div>
              
              <p className={styles.modalDesc}>{quickViewItem.description}</p>
              
              {(quickViewItem.wearTag === "womens" || quickViewItem.wearTag === "unisex") && (
                <div className={styles.modalSizeRow} style={{ marginBottom: "1rem" }}>
                  <span className={styles.qtyLabel}>{quickViewItem.wearTag === "unisex" ? "Gender:" : "Fit:"}</span>
                  <div className={styles.sizeGrid} style={{ flex: 1 }}>
                    {(quickViewItem.wearTag === "unisex" ? ["Men", "Women"] : ["Standard", "Thick"]).map((fit) => (
                      <button 
                        key={fit} 
                        className={`${styles.sizeBtn} ${quickViewFit === fit ? styles.sizeBtnActive : ""}`}
                        onClick={() => { setQuickViewFit(fit); setQuickViewSize(""); }}
                        style={{ flex: 1 }}
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
                  {getAvailableSizes(quickViewItem, quickViewFit).map((sz: string) => (
                    <button 
                      key={sz} 
                      className={`${styles.sizeBtn} ${quickViewSize === sz ? styles.sizeBtnActive : ""}`}
                      onClick={() => setQuickViewSize(prev => prev === sz ? "" : sz)}
                    >
                      {formatSizeLabel(sz, quickViewFit, quickViewItem.wearTag)}
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
              {quickViewSize === "Custom" && (
                <p className={styles.customNotice}>
                  Custom sizing selected. We will contact you for measurements after checkout.
                </p>
              )}

              {(() => {
                const quickViewStockStatus = getVariantStockStatus(quickViewItem, quickViewActiveColorVariant, quickViewActiveCombo, quickViewMode || "solo");
                const isBespoke = quickViewStockStatus.isBespokeProduct;
                return isBespoke ? (
                  <p className={styles.customNotice} style={{ color: "#5b21b6", background: "#f5f3ff", marginTop: "12px" }}>
                    🧵 Bespoke order. Expect ~{quickViewStockStatus.bespokeLeadDays || 14} days for production.
                  </p>
                ) : quickViewStockStatus.isSelectedOutOfStock ? (
                  <p className={styles.customNotice} style={{ color: "#c00", background: "#fee", marginTop: "12px" }}>
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
                        const quickViewStockStatus = getVariantStockStatus(quickViewItem, quickViewActiveColorVariant, quickViewActiveCombo, quickViewMode || "solo");
                        const isBespoke = quickViewStockStatus.isBespokeProduct;
                        if (isBespoke || qty < quickViewStockStatus.maxStock) {
                          setQty(qty + 1);
                        } else {
                          toast.error(`Only ${quickViewStockStatus.maxStock} items available.`);
                        }
                      }}
                      disabled={!(getVariantStockStatus(quickViewItem, quickViewActiveColorVariant, quickViewActiveCombo, quickViewMode || "solo").isBespokeProduct) && qty >= getVariantStockStatus(quickViewItem, quickViewActiveColorVariant, quickViewActiveCombo, quickViewMode || "solo").maxStock}
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
                {(() => {
                  const quickViewStockStatus = getVariantStockStatus(quickViewItem, quickViewActiveColorVariant, quickViewActiveCombo, quickViewMode || "solo");
                  const isBespoke = quickViewStockStatus.isBespokeProduct;
                  return (
                    <button 
                      className={`btn btn-primary ${styles.modalAddBtn}`} 
                      disabled={(quickViewStockStatus.isSelectedOutOfStock && !isBespoke) || addStatus !== "idle"}
                      style={{ transition: "all 0.3s ease" }}
                      onClick={() => {
                        if (!quickViewSize && quickViewItem.sizes?.length) {
                          toast.error(`Please select a size for ${quickViewItem.name} first!`);
                          return;
                        }

                        setAddStatus("adding");
                        setTimeout(() => {
                          import("@/store/cartStore").then(({ cartStore }) => {
                            const quickViewStockStatusCart = getVariantStockStatus(quickViewItem, quickViewActiveColorVariant, quickViewActiveCombo, quickViewMode || "solo");
                            cartStore.addItem({
                              productId: quickViewItem.id,
                              name: quickViewItem.name,
                              color: quickViewActiveColorVariant?.name ,
                              colorHex: quickViewActiveColorVariant?.colorHex,
                              combo: quickViewActiveCombo ? quickViewActiveCombo.name : undefined,
                              size: quickViewSize || "Standard",
                              fit: (quickViewItem.wearTag === "womens" || quickViewItem.wearTag === "unisex") ? quickViewFit : undefined,
                              wearTag: quickViewItem.wearTag,
                              price: quickViewActiveCombo ? (quickViewActiveCombo.price || quickViewItem.price) : quickViewItem.price,
                              image: quickViewActiveCombo?.thumbnailUrl || quickViewGalleryImages[0] || quickViewItem.image,
                              image2: quickViewActiveCombo?.images?.[0] || quickViewGalleryImages[1] || quickViewItem.images?.[0],
                              quantity: qty,
                              maxStock: quickViewStockStatusCart.maxStock ?? 99,
                              isBespoke: quickViewStockStatusCart.isBespokeProduct || undefined,
                              bespokeLeadDays: quickViewStockStatusCart.isBespokeProduct ? (quickViewStockStatusCart.bespokeLeadDays ?? 14) : undefined,
                            });
                            
                            setAddStatus("added");
                            toast.success(`${quickViewItem.name} added to your cart!`);
                            setTimeout(() => {
                              setAddStatus("idle");
                              setQuickViewItem(null);
                              setQuickViewImage("");
                            }, 2000);
                          });
                        }, 400);
                      }}
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
                  onClick={() => toggleWishlist(quickViewItem)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={isInWishlist(quickViewItem.id) ? "var(--alaska-gray)" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                  {isInWishlist(quickViewItem.id) ? "Saved To Wishlist" : "Add To Wishlist"}
                </button>
              </div>

              {(() => {
                const quickViewStockStatus = getVariantStockStatus(quickViewItem, quickViewActiveColorVariant, quickViewActiveCombo, quickViewMode || "solo");
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
                  const colName = getCollectionName(quickViewItem);
                  return colName ? <p><span>Collection:</span> {colName}</p> : null;
                })()}
              </div>
              <Link href={`/shop/${quickViewItem.slug || quickViewItem.id}`} className={styles.modalFullDetail} onClick={() => { setQuickViewItem(null); setQuickViewImage(""); }}>
                View Full Details →
              </Link>
            </div>
          </div>
        </div>
      </div>
    )}

      <SizeGuideModal
        open={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
        kind={sizeGuideKind}
      />
  </>
  );
}
