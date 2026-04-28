"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useSyncExternalStore, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { dataStore, SHOP_COLLECTIONS_FALLBACK } from "@/lib/dataStore";
import styles from "../CollectionClient.module.css";
import shopStyles from "@/app/shop/ShopClient.module.css";
import eventStyles from "@/app/events/events.module.css";
import PageHeroShellImageLoader from "@/components/page-hero/PageHeroShellImageLoader";
import EventVideo from "@/app/events/[slug]/EventVideo";
import { PAGE_HERO_SHELL_CLASS, usePageHeroShellRenderProps } from "@/hooks/usePageHero";
import { useStoreLoading } from "@/hooks/useStoreLoading";
import { wishlistStore, type WishlistItem } from "@/store/wishlistStore";
import type { Product } from "@/lib/types";
import { ShopProductGridSkeleton } from "@/components/shop/ShopProductGridSkeleton";


const formatPrice = (price: number) => `GHC ${price.toLocaleString()}`;

type WearFilter = "all" | "mens" | "womens";

const wearFilters: { id: WearFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "mens", label: "Men's wear" },
  { id: "womens", label: "Women's wear" },
];

type CollectionDetailClientProps = {
  slug: string;
};

const EMPTY_PRODUCTS: Product[] = [];
const EMPTY_WISHLIST: WishlistItem[] = [];

export default function CollectionDetailClient({ slug }: CollectionDetailClientProps) {
  const router = useRouter();
  const products = useSyncExternalStore(dataStore.subscribe, dataStore.getProducts, () => EMPTY_PRODUCTS);
  const collections = useSyncExternalStore(dataStore.subscribe, dataStore.getCollections, () => SHOP_COLLECTIONS_FALLBACK);
  const isStoreLoading = useStoreLoading();

  const wishlistItems = useSyncExternalStore(wishlistStore.subscribe, wishlistStore.getItems, () => EMPTY_WISHLIST);

  const [quickViewPiece, setQuickViewPiece] = useState<Product | null>(null);
  const [activeImage, setActiveImage] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState("");
  const [addStatus, setAddStatus] = useState<"idle" | "adding" | "added">("idle");
  const [wearFilter, setWearFilter] = useState<WearFilter>("all");

  const {
    empty: collectionHeroEmpty,
    shellSpinner: collectionHeroSpinner,
    style: collectionHeroStyle,
    showImageLoader: collectionHeroImageLoader,
  } = usePageHeroShellRenderProps("collection");

  // Find the specific collection - flexible case comparison
  const collection = collections.find(c => c.slug?.toLowerCase() === slug?.toLowerCase()) || 
                     SHOP_COLLECTIONS_FALLBACK.find(c => c.slug?.toLowerCase() === slug?.toLowerCase());

  const briefHero = (collection?.briefDescription ?? "").trim();

  const collectionGallery = useMemo(
    () => (collection?.galleryUrls ?? []).map((u) => String(u || "").trim()).filter(Boolean),
    [collection?.galleryUrls],
  );

  const detailWriteup = useMemo(() => {
    const w = String(collection?.detailWriteup ?? "").trim();
    if (w) return w;
    const fallback = String(collection?.description ?? "").trim();
    return fallback;
  }, [collection?.detailWriteup, collection?.description]);

  const detailVideoUrl = String(collection?.detailVideoUrl ?? "").trim();
  const detailVideoPosterUrl = String(collection?.detailVideoPosterUrl ?? "").trim();
  const detailGallery = useMemo(
    () => (collection?.detailGalleryUrls ?? []).map((u) => String(u || "").trim()).filter(Boolean),
    [collection?.detailGalleryUrls],
  );

  const collectionProducts = useMemo(() => {
    if (!collection) return [];
    return products.filter(
      (p) =>
        p.category?.toLowerCase() === collection.slug?.toLowerCase() ||
        p.categoryName?.toLowerCase() === collection.name?.toLowerCase() ||
        p.category?.toLowerCase() === collection.name?.toLowerCase() ||
        p.category?.toLowerCase() === collection.slug?.replace(/-/g, " ").toLowerCase(),
    );
  }, [products, collection]);

  const getCollectionName = useMemo(() => {
    return (p: any): string => {
      const slug = String(p?.category || "").trim();
      if (!slug || slug === "none") return "";
      const match = (collections as any[]).find((c: any) => c?.slug === slug);
      return match?.name ? String(match.name) : "";
    };
  }, [collections]);

  const displayedProducts = useMemo(() => {
    let list = collectionProducts;
    if (wearFilter === "mens") {
      list = list.filter((p) => p.wearTag === "mens" || p.wearTag === "unisex");
    } else if (wearFilter === "womens") {
      list = list.filter((p) => p.wearTag === "womens" || p.wearTag === "unisex");
    }
    return list;
  }, [collectionProducts, wearFilter]);

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

  const isInWishlist = (id: string) => wishlistItems.some((item) => item.id === id);
  const toggleWishlist = (p: Product) => {
    const wasInWishlist = isInWishlist(p.id);
    wishlistStore.toggleItem({
      id: p.id,
      name: p.name,
      price: String(p.price),
      image: p.image,
      hoverImage: p.hoverImage,
      category: p.categoryName,
    });
    toast.success(wasInWishlist ? `${p.name} removed from wishlist` : `${p.name} added to wishlist`);
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
    if (isStoreLoading) {
      return (
        <div className={styles.page}>
          <div
            className={`${PAGE_HERO_SHELL_CLASS} ${styles.pageHeader}`}
            style={{ background: "#e8e5e0", minHeight: 280 }}
          >
            <div className="container" style={{ paddingTop: 80 }}>
              <div className="skeleton" style={{ height: 12, width: 100, marginBottom: 16 }} />
              <div className="skeleton" style={{ height: 52, width: "55%", marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 16, width: "40%" }} />
            </div>
          </div>
          <div className={`section ${shopStyles.productsSection}`}>
            <div className="container">
              <ShopProductGridSkeleton count={6} />
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className={styles.page}>
        <div
          className={`${PAGE_HERO_SHELL_CLASS} ${styles.pageHeader}`}
          data-page-hero-empty={collectionHeroEmpty ? "true" : "false"}
          data-page-hero-loading={collectionHeroSpinner ? "true" : "false"}
          style={collectionHeroStyle}
        >
          {collectionHeroImageLoader ? <PageHeroShellImageLoader /> : null}
          <div className="container">
            <span className="section-label">COLLECTIONS</span>
            <h1 className={`t-display ${styles.pageTitle}`}>Collection Not Found</h1>
            <p className={styles.pageSubtext}>
               We couldn&apos;t find a collection matching &quot;{slug}&quot;.
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
      <div
        className={`${PAGE_HERO_SHELL_CLASS} ${styles.pageHeader}`}
        data-page-hero-empty={collectionHeroEmpty ? "true" : "false"}
        data-page-hero-loading={collectionHeroSpinner ? "true" : "false"}
        style={collectionHeroStyle}
      >
        {collectionHeroImageLoader ? <PageHeroShellImageLoader /> : null}
        <div className="container">
          <span className="section-label">COLLECTIONS</span>
          <h1 className={`t-display ${styles.pageTitle}`}>{collection.name}</h1>
          {briefHero ? (
            <p className={styles.pageSubtext}>{briefHero}</p>
          ) : null}
        </div>
      </div>

      <div className={styles.breadcrumbs}>
        <div className="container">
          <button
            type="button"
            className={`${styles.crumbLink} ${styles.crumbBackBtn}`}
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push("/collection");
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

      {collectionGallery.length > 0 ? (
        <section className={`${eventStyles.section} ${styles.collectionGallerySection}`}>
          <div className="container">
            <div className={`${eventStyles.shotsSection} ${styles.collectionShotsSection}`}>
              <div className={`${eventStyles.shotsGrid} ${styles.collectionShotsGrid}`} aria-label="Collection gallery">
                {collectionGallery.map((u, idx) => (
                  <div key={`${u}-${idx}`} className={`${eventStyles.shotCard} ${styles.collectionShotCard}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className={`${eventStyles.shotImg} ${styles.collectionShotImg}`} src={u} alt="" loading="lazy" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {detailWriteup ? (
        <section className={`${styles.collectionDetailEditorial} ${styles.collectionDetailCentered}`}>
          <div className="container">
            <div className={styles.collectionDetailEditorialRow}>
              <div className={styles.collectionDetailProseCol}>
                <h2 className={`t-display ${styles.collectionDetailTitle}`}>{collection.name}</h2>
                <p className={styles.collectionDetailProse}>{detailWriteup}</p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {detailVideoUrl ? (
        <section className={styles.collectionDetailVideoSection} aria-label="Collection video">
          <div className="container">
            <div className={eventStyles.videoSection} style={{ marginTop: 0, position: "relative", aspectRatio: "16 / 9" as any }}>
              <EventVideo src={detailVideoUrl} posterUrl={detailVideoPosterUrl || undefined} />
            </div>
          </div>
        </section>
      ) : null}

      {detailGallery.length > 0 ? (
        <section className={`${eventStyles.section} ${styles.collectionGallerySection}`}>
          <div className="container">
            <div className={`${eventStyles.shotsSection} ${styles.collectionShotsSection}`}>
              <div className={`${eventStyles.shotsGrid} ${styles.collectionShotsGrid}`} aria-label="More collection images">
                {detailGallery.map((u, idx) => (
                  <div key={`${u}-${idx}`} className={`${eventStyles.shotCard} ${styles.collectionShotCard}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className={`${eventStyles.shotImg} ${styles.collectionShotImg}`} src={u} alt="" loading="lazy" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {collectionProducts.length > 0 ? (
        <div className={shopStyles.wearFilterBar}>
          <div className={`container ${shopStyles.wearFilterInner}`}>
            <span className={shopStyles.wearFilterLabel} id="collection-wear-filter-label">
              Shop by
            </span>
            <div
              className={shopStyles.wearPills}
              role="group"
              aria-labelledby="collection-wear-filter-label"
            >
              {wearFilters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`${shopStyles.wearPill} ${wearFilter === f.id ? shopStyles.wearPillActive : ""}`}
                  onClick={() => setWearFilter(f.id)}
                  aria-pressed={wearFilter === f.id}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Product grid — same markup/styles as Shop */}
      <div id="collection-products" className={`section ${shopStyles.productsSection}`}>
        <div className="container">
          {collectionProducts.length === 0 ? (
            <div className={shopStyles.empty}>
              <p>No pieces found in this collection yet.</p>
              <Link href="/collection" className="btn btn-outline mt-4">
                Browse All Collections
              </Link>
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className={shopStyles.empty}>
              <p>No pieces match this filter yet. Try &quot;All&quot; or another wear option.</p>
              <button type="button" className="btn btn-outline mt-4" onClick={() => setWearFilter("all")}>
                Show all pieces
              </button>
            </div>
          ) : (
            <div className={shopStyles.grid}>
              {displayedProducts.map((p) => (
                <article key={p.id} className={shopStyles.card}>
                  <div className={shopStyles.imageWrapOuter}>
                    <div className={shopStyles.imageWrap}>
                      {p.hoverImage ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.image} alt={p.name} className={shopStyles.imagePrimary} loading="lazy" />
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.hoverImage} alt="" className={shopStyles.imageHover} loading="lazy" aria-hidden />
                        </>
                      ) : (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.image} alt={p.name} className={shopStyles.image} loading="lazy" />
                        </>
                      )}

                      <div className={shopStyles.overlay}>
                        <div className={shopStyles.actionButtons}>
                        <button
                          className={shopStyles.iconBtn}
                          aria-label="Add to Wishlist"
                          title="Add to Wishlist"
                          onClick={() => toggleWishlist(p)}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill={isInWishlist(p.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" suppressHydrationWarning>
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                          </svg>
                        </button>
                        <button
                          className={shopStyles.iconBtn}
                          aria-label="Quick View"
                          title="Quick View"
                          onClick={() => setQuickViewPiece(p)}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="6" cy="15" r="4"/><circle cx="18" cy="15" r="4"/><path d="M14 15a2 2 0 0 0-2-2 2 2 0 0 0-2 2"/><path d="M2.5 13 5 7c.7-1.3 1.4-2 3-2"/><path d="M21.5 13 19 7c-.7-1.3-1.5-2-3-2"/>
                          </svg>
                        </button>
                        </div>

                        <div className={shopStyles.pickMeWrap}>
                          {p.isOutOfStock ? (
                            <span className={`${shopStyles.pickMeBtn} ${shopStyles.soldOutBtn}`}>Sold Out</span>
                          ) : (
                            <Link href={`/shop/${p.slug || p.id}`} className={shopStyles.pickMeBtn} aria-label={`View ${p.name}`}>
                              Pick Me
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={shopStyles.badgeStack} aria-hidden="true">
                      {p.isOutOfStock ? (
                        <span className={shopStyles.saleBadge} style={{ background: "#ef4444" }}>
                          OUT OF STOCK
                        </span>
                      ) : (
                        <>
                          {p.category === "sample-sale" && <span className={shopStyles.saleBadge}>SALE</span>}
                          {p.isLimited && p.category !== "sample-sale" && (
                            <span className={shopStyles.saleBadge} style={{ background: "#8b5cf6" }}>
                              LIMITED
                            </span>
                          )}
                          {p.isBestSeller && (
                            <span className={shopStyles.saleBadge} style={{ background: "#f59e0b" }}>
                              BEST SELLER
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className={shopStyles.info}>
                    <span className={shopStyles.category}>{getCollectionName(p)}</span>
                    <h2 className={shopStyles.name}>{p.name}</h2>
                    <div className={shopStyles.priceRow}>
                      <span className={shopStyles.price}>{formatPrice(p.price)}</span>
                      {p.originalPrice ? (
                        <span className={shopStyles.originalPrice}>{formatPrice(p.originalPrice)}</span>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
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
                      {/* eslint-disable-next-line @next/next/no-img-element */}
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
                    onClick={() => toggleWishlist(quickViewPiece)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={isInWishlist(quickViewPiece.id) ? "var(--alaska-gray)" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" suppressHydrationWarning>
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    {isInWishlist(quickViewPiece.id) ? "Saved" : "Wishlist"}
                  </button>
                </div>

                <div className={styles.modalMeta}>
                  <p><span>Collection:</span> {getCollectionName(quickViewPiece)}</p>
                </div>
                <Link href={`/shop/${quickViewPiece.slug || quickViewPiece.id}`} className={styles.modalFullDetail}>
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
