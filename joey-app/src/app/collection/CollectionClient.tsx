"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import styles from "./CollectionClient.module.css";

const collectionPieces = [
  { id: "structured-blazer", name: "The Structured Blazer", category: "ALWAYS LIT", price: "GHC 850", image: "/lookbook.png", images: ["/lookbook.png", "/hero.png", "/founder.png", "/lookbook.png"], desc: "Precision cut, elevated structure.", sizes: ["XS", "S", "M", "L", "Custom"] },
  { id: "identity-coat", name: "The Identity Coat", category: "LIMITED-EDITION", price: "GHC 1,200", image: "/lookbook.png", images: ["/lookbook.png", "/hero.png", "/founder.png"], desc: "Limited fabric. Will not be remade.", sizes: ["S", "M", "L", "Custom"] },
  { id: "presence-set", name: "The Presence Set", category: "ALWAYS LIT", price: "GHC 980", image: "/lookbook.png", images: ["/lookbook.png", "/hero.png", "/founder.png"], desc: "Two-piece power ensemble.", sizes: ["XS", "S", "M", "L", "XL", "Custom"] },
  { id: "power-shirt", name: "The Power Shirt", category: "ALWAYS LIT", price: "GHC 380", image: "/lookbook.png", images: ["/lookbook.png", "/hero.png", "/founder.png"], desc: "Clean lines. Bold statement.", sizes: ["S", "M", "L"] },
  { id: "symbol-jacket", name: "The Symbol Jacket", category: "LIMITED-EDITION", price: "GHC 1,050", image: "/lookbook.png", images: ["/lookbook.png", "/hero.png", "/founder.png"], desc: "Cultural symbolism woven in.", sizes: ["M", "L"] },
];

export default function CollectionClient() {
  const [quickViewPiece, setQuickViewPiece] = useState<typeof collectionPieces[0] | null>(null);
  const [activeImage, setActiveImage] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState("");
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
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

  const toggleWishlist = (id: string) => {
    const newW = new Set(wishlist);
    if (newW.has(id)) newW.delete(id);
    else newW.add(id);
    setWishlist(newW);
  };

  const handleAddToCart = () => {
    if (!quickViewPiece) return;
    if (!selectedSize) {
      toast.error("Please pick a size before adding to cart.");
      return;
    }
    const priceNum = Number(quickViewPiece.price.replace(/[^0-9.-]+/g, ""));
    setAddStatus("adding");
    setTimeout(() => {
      import("@/store/cartStore").then(({ cartStore }) => {
        cartStore.addItem({
          productId: quickViewPiece.id,
          name: quickViewPiece.name,
          size: selectedSize || "Standard",
          price: priceNum,
          image: quickViewPiece.image,
          quantity: qty
        });
        setAddStatus("added");
        setTimeout(() => setAddStatus("idle"), 2000);
      });
    }, 400);
  };

  return (
    <div className={styles.page}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <div className="container">
          <span className="section-label">The Collection</span>
          <h1 className={`t-display ${styles.pageTitle}`}>Collection</h1>
          <p className={styles.pageSubtext}>
            Curated statement pieces from the house of JOEY.
          </p>
        </div>
      </div>

      {/* Products */}
      <div className={`section ${styles.productsSection}`}>
        <div className="container">
          <div className={styles.grid}>
            {collectionPieces.map((p) => (
              <article key={p.id} className={styles.card}>
                <div className={styles.imageWrap}>
                  <img src={p.image} alt={p.name} className={styles.image} loading="lazy" />

                  {/* Hover actions overlay */}
                  <div className={styles.overlay}>
                    <div className={styles.actionButtons}>
                      <button
                        className={styles.iconBtn}
                        aria-label="Add to Wishlist"
                        title="Add to Wishlist"
                        onClick={() => toggleWishlist(p.id)}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill={wishlist.has(p.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
                </div>
                <div className={styles.info}>
                  <span className={styles.category}>{p.category}</span>
                  <h2 className={styles.name}>{p.name}</h2>
                  <p className={styles.desc}>{p.desc}</p>
                  <div className={styles.priceRow}>
                    <span className={styles.price}>{p.price}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
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
                    {quickViewPiece.images.map((img, idx) => (
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
                  <span className={styles.modalPrice}>{quickViewPiece.price}</span>
                </div>

                <p className={styles.modalDesc}>{quickViewPiece.desc}</p>
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
                  <button className={styles.sizeGuideBtn}>Size Guide</button>
                </div>
                {selectedSize === "Custom" && (
                  <p className={styles.customNotice}>
                    Custom sizing selected. We will contact you for measurements after checkout.
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
                    disabled={addStatus !== "idle"}
                    style={{ transition: "all 0.3s ease", width: "100%", justifyContent: "center" }}
                  >
                    {addStatus === "idle" && "Add To Cart"}
                    {addStatus === "adding" && "Adding..."}
                    {addStatus === "added" && "Added"}
                  </button>
                  <button
                    className={styles.modalWishlistBtn}
                    onClick={() => toggleWishlist(quickViewPiece.id)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={wishlist.has(quickViewPiece.id) ? "var(--alaska-gray)" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    {wishlist.has(quickViewPiece.id) ? "Saved to wishlist" : "Add to wishlist"}
                  </button>
                </div>

                <div className={styles.modalMeta}>
                  <p><span>SKU:</span> {quickViewPiece.id}</p>
                  <p><span>Category:</span> {quickViewPiece.category}</p>
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
