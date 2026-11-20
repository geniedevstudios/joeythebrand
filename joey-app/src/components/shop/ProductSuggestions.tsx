"use client";
import Link from "next/link";
import { getCardFulfillmentSummary } from "@/lib/variantUtils";
import { Clock } from "lucide-react";
import ProductMedia from "@/components/shop/ProductMedia";
import shopStyles from "@/app/shop/ShopClient.module.css";
import productStyles from "@/app/shop/[slug]/ProductClient.module.css";

interface ProductSuggestionsProps {
  suggestedProducts: any[];
  suggestionPhrase: string;
  setQuickViewPiece: (piece: any) => void;
  formatPrice: (price: number | string) => string;
  marginTop?: string;
  paddingBottom?: string;
}

export default function ProductSuggestions({
  suggestedProducts,
  suggestionPhrase,
  setQuickViewPiece,
  formatPrice,
  marginTop,
  paddingBottom
}: ProductSuggestionsProps) {
  if (suggestedProducts.length === 0) return null;

  return (
    <div className={productStyles.suggestionsSection} style={{ marginTop, background: "var(--color-bg)", paddingBottom }}>
      <div className="container">
        <div className={productStyles.suggestionsHeader}>
          <h2 className={productStyles.suggestionsTitle}>{suggestionPhrase}</h2>
          <Link href="/shop" className={productStyles.seeAllLink}>See all pieces →</Link>
        </div>
        <div className={productStyles.suggestionsGrid}>
          {suggestedProducts.map((item: any) => {
            const colorVariants = (item.variants || []).filter((v: any) => v.type === "color");
            const hasColors = colorVariants.length > 0;
            const swatchesToShow = colorVariants.slice(0, 3);
            const totalColors = colorVariants.length;

            return (
              <article key={item.id} className={productStyles.suggestCard}>
                <div style={{ position: "relative" }}>
                  <div className={productStyles.suggestImgWrap}>
                  {item.hoverImage ? (
                    <>
                      <ProductMedia src={item.image} alt={item.name} className={productStyles.suggestImgPrimary} loading="lazy" />
                      <ProductMedia src={item.hoverImage} alt="" className={productStyles.suggestImgHover} loading="lazy" aria-hidden="true" />
                    </>
                  ) : (
                    <ProductMedia src={item.image} alt={item.name} className={productStyles.suggestImg} loading="lazy" />
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

                  <div className={productStyles.suggestOverlay}>
                    <div className={productStyles.suggestActions}>
                      <button
                        className={productStyles.suggestIconBtn}
                        aria-label="Quick View"
                        onClick={() => setQuickViewPiece(item)}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="6" cy="15" r="4"/><circle cx="18" cy="15" r="4"/><path d="M14 15a2 2 0 0 0-2-2 2 2 0 0 0-2 2"/><path d="M2.5 13 5 7c.7-1.3 1.4-2 3-2"/><path d="M21.5 13 19 7c-.7-1.3-1.5-2-3-2"/>
                        </svg>
                      </button>
                    </div>
                    <div className={productStyles.suggestPickMeWrap}>
                      {(() => {
                        const { isMadeToOrder, isSoldOut } = getCardFulfillmentSummary(item);
                        return isMadeToOrder ? (
                          <Link href={`/shop/${item.slug || item.id}`} className={productStyles.suggestPickMeBtn}>
                            Made to Order
                          </Link>
                        ) : isSoldOut ? (
                          <span className={`${productStyles.suggestPickMeBtn} ${shopStyles.soldOutBtn}`}>
                            Sold Out
                          </span>
                        ) : (
                          <Link href={`/shop/${item.slug || item.id}`} className={productStyles.suggestPickMeBtn}>
                            Pick Me
                          </Link>
                        );
                      })()}
                    </div>
                  </div>
                </div>

              </div>
                <div className={productStyles.suggestInfo}>
                  <h3 className={productStyles.suggestName} style={{ fontSize: item.name.length > 24 ? "0.95rem" : item.name.length > 16 ? "1.1rem" : undefined }}>{item.name}</h3>
                  <p className={productStyles.suggestPrice}>{formatPrice(item.price)}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
