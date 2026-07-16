"use client";
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { toast } from "sonner";
import styles from "./CartClient.module.css";
import PageHeroShellImageLoader from "@/components/page-hero/PageHeroShellImageLoader";
import { PAGE_HERO_SHELL_CLASS, usePageHeroShellRenderProps } from "@/hooks/usePageHero";
import { cartStore, type CartItem } from "@/store/cartStore";
import { dataStore } from "@/lib/dataStore";
import { authStore } from "@/store/authStore";
import ProductMedia from "@/components/shop/ProductMedia";
import { formatSizeLabel } from "@/lib/formatSizeLabel";

const EMPTY_ARRAY: CartItem[] = [];

export default function CartClient() {
  const items = useSyncExternalStore(cartStore.subscribe, cartStore.getCart, () => EMPTY_ARRAY);
  const appliedPromo = useSyncExternalStore(cartStore.subscribe, cartStore.getAppliedPromo, () => null);
  const user = useSyncExternalStore(authStore.subscribe, authStore.getUser, () => null);
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);

  const subtotalRaw = items.reduce((acc, current) => acc + (current.price * current.quantity), 0);
  const discount = appliedPromo?.discount || 0;
  const total = subtotalRaw - discount;
  const formattedSubtotal = `GHC ${subtotalRaw.toLocaleString()}`;
  const formattedTotal = `GHC ${total.toLocaleString()}`;
  const {
    empty: cartHeroEmpty,
    shellSpinner: cartHeroSpinner,
    style: cartHeroStyle,
    showImageLoader: cartHeroImageLoader,
    imageReady: cartHeroImageReady,
  } = usePageHeroShellRenderProps("cart");

  const handleUpdateQuantity = (id: string, delta: number) => {
    cartStore.updateQuantity(id, delta);
  };

  const handleRemove = (id: string) => {
    cartStore.removeItem(id);
  };

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError("");
    setPromoSuccess("");

    if (!promoInput.trim()) return;

    try {
      const promo = await dataStore.validatePromoCode(promoInput.trim());
      if (!promo) {
        setPromoError("Invalid or inactive promo code");
        return;
      }

      cartStore.applyPromotion(promo.code, promo.percentage);
      setPromoSuccess(`Code applied! ${promo.percentage}% off`);
      setPromoInput("");
      setPromoOpen(false);
    } catch {
      setPromoError("Failed to validate code. Please try again.");
    }
  };

  const handleRemovePromo = () => {
    cartStore.removePromotion();
    setPromoSuccess("");
  };

  if (items.length === 0) {
    return (
      <div className={styles.cartPage}>
        <div
          className={`${PAGE_HERO_SHELL_CLASS} ${styles.pageHeader}`}
          data-page-hero-empty={cartHeroEmpty ? "true" : "false"}
          data-page-hero-loading={cartHeroSpinner ? "true" : "false"}
          data-page-hero-ready={cartHeroImageReady ? "true" : "false"}
          style={cartHeroStyle}
        >
          {cartHeroImageLoader ? <PageHeroShellImageLoader /> : null}
          <div className="container">
            <span className="section-label">Your Bag</span>
            <h1 className={`t-display ${styles.pageTitle}`}>Cart</h1>
          </div>
        </div>
        <div className={`container section ${styles.emptyWrapper}`}>
          <div className={styles.centeredEmpty}>
            <div className={styles.emptyTextGroup}>
              <span className={styles.emptyLine}>It&apos;s a little</span>
              <span className={styles.emptyLine}>
                <em className={styles.emptyItalic}>empty</em> here
              </span>
            </div>
            <p className={styles.emptySub}>Your cart is currently empty</p>
            <Link href="/shop" className="btn btn-primary btn-lg">
              START SHOPPING
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.cartPage}>
      <div
        className={`${PAGE_HERO_SHELL_CLASS} ${styles.pageHeader}`}
        data-page-hero-empty={cartHeroEmpty ? "true" : "false"}
        data-page-hero-loading={cartHeroSpinner ? "true" : "false"}
        data-page-hero-ready={cartHeroImageReady ? "true" : "false"}
        style={cartHeroStyle}
      >
        {cartHeroImageLoader ? <PageHeroShellImageLoader /> : null}
        <div className="container">
          <span className="section-label">Your Bag</span>
          <h1 className={`t-display ${styles.pageTitle}`}>Cart</h1>
        </div>
      </div>

      <div className={`container ${styles.cartPageInner}`}>
      <div className={styles.mainLayout}>
        <div className={styles.itemsColumn}>
          <div className={styles.header}>
            <h1 className={styles.title}>
              Your cart<sup className={styles.sup}>{items.reduce((s, i) => s + i.quantity, 0)}</sup>
            </h1>
            <Link href="/shop" className={styles.continueLink}>CONTINUE SHOPPING</Link>
          </div>
          
          <div className={styles.tableHeader}>
            <div className={styles.colProduct}>PRODUCT</div>
            <div className={styles.colPrice}>PRICE</div>
            <div className={styles.colQty}>QUANTITY</div>
            <div className={styles.colTotal}>TOTAL</div>
          </div>

          <div className={styles.itemsList}>
            {items.map((item) => {
              const itemTotal = item.price * item.quantity;
              const formattedItemTotal = `GHC ${itemTotal.toLocaleString()}`;
              const formattedBasePrice = `GHC ${item.price.toLocaleString()}`;

              return (
                <div key={`${item.id}-${item.size}`} className={styles.cartRow}>
                  <div className={`${styles.cell} ${styles.colProduct}`}>
                    <div className={styles.itemImgBox}>
                      <ProductMedia src={item.image} alt={item.name} className={styles.itemImg} />
                    </div>
                    <div className={styles.itemDetails}>
                      <Link href={`/shop/${item.productId}`} className={styles.itemName}>{item.name}</Link>
                      {(item.color || item.colorHex) && (
                        <div className={styles.itemVariant} style={{ fontSize: "12px", color: "var(--cinereous)", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px", textTransform: "capitalize" }}>
                          Color: {item.colorHex ? <span style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: item.colorHex || "#ccc", backgroundImage: item.image ? `url(${item.image})` : "none", backgroundSize: "cover", backgroundPosition: "center", border: "1px solid #ccc", display: "inline-block" }} title={item.color} /> : item.color}
                        </div>
                      )}
                      {item.combo && <p className={styles.itemVariant} style={{ fontSize: "12px", color: "var(--cinereous)", marginTop: "4px", textTransform: "capitalize" }}>Combo: {item.combo}</p>}
                      <p className={styles.itemSize}>
                        {formatSizeLabel(item.size, item.fit, item.wearTag)}{item.fit ? ` — ${item.fit} Fit` : ""}
                      </p>
                      {item.isBespoke && (
                        <p style={{ fontSize: "11px", color: "#7c3aed", background: "#f5f3ff", padding: "3px 8px", borderRadius: "4px", marginTop: "4px", display: "inline-block", fontWeight: 600 }}>
                          Bespoke Order · ~{item.bespokeLeadDays || 14} days
                        </p>
                      )}
                    </div>
                  </div>

                  <div className={`${styles.cell} ${styles.colPrice}`}>
                    <span className={styles.mobileLabel}>Price:</span>
                    {formattedBasePrice}
                  </div>

                  <div className={`${styles.cell} ${styles.colQty}`}>
                    <span className={styles.mobileLabel}>Quantity:</span>
                    <div className={styles.qtyControlsWrapper}>
                      <div className={styles.qtyBox}>
                        <button onClick={() => handleUpdateQuantity(item.id, -1)} className={styles.qtyBtn}>&minus;</button>
                        <span className={styles.qtyVal}>{item.quantity}</span>
                        <button onClick={() => handleUpdateQuantity(item.id, 1)} className={styles.qtyBtn}>+</button>
                      </div>
                      <button onClick={() => handleRemove(item.id)} className={styles.trashBtn} aria-label="Remove item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className={`${styles.cell} ${styles.colTotal} ${styles.totalRight}`}>
                    <span className={styles.mobileLabel}>Total:</span>
                    {formattedItemTotal}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.summarySidebar}>
          <div className={styles.summaryBox}>
            {discount > 0 && (
              <div className={styles.subtotalRow}>
                <span className={styles.subLabel}>Subtotal</span>
                <span className={styles.subValue} style={{ textDecoration: "line-through", opacity: 0.6 }}>{formattedSubtotal}</span>
              </div>
            )}
            {discount > 0 && (
              <div className={styles.subtotalRow}>
                <span className={styles.subLabel} style={{ color: "var(--wood)" }}>Discount ({appliedPromo?.code})</span>
                <span className={styles.subValue} style={{ color: "var(--wood)" }}>-GHC {discount.toLocaleString()}</span>
              </div>
            )}
            <div className={styles.subtotalRow}>
              <span className={styles.subLabel}>{discount > 0 ? "Total" : "Subtotal"}</span>
              <span className={styles.subValue}>{discount > 0 ? formattedTotal : formattedSubtotal}</span>
            </div>
            
            <p className={styles.taxesText}>
              Taxes included. <Link href="/shipping" className={styles.underline}>Shipping</Link> calculated at checkout.
            </p>

            <div className={styles.noteSection}>
              {appliedPromo ? (
                <div className={styles.appliedPromoInline}>
                  <span className={styles.promoCodeBadge}>{appliedPromo.code}</span>
                  <span className={styles.promoPercentBadge}>-{appliedPromo.percentage}%</span>
                  <button className={styles.removePromoInline} onClick={handleRemovePromo}>Remove</button>
                </div>
              ) : (
                <>
                  <button className={styles.noteToggle} onClick={() => setPromoOpen(!promoOpen)}>
                    Apply promo code <span className={styles.plusMinus}>{promoOpen ? "−" : "+"}</span>
                  </button>
                  {promoOpen && (
                    <div className={styles.noteCollapse}>
                      <div className={styles.promoInputWrap}>
                        <input 
                          type="text" 
                          className={styles.promoInput}
                          placeholder="Enter code"
                          value={promoInput}
                          onChange={(e) => setPromoInput(e.target.value)}
                        />
                        <button 
                          className={styles.promoApplyBtn}
                          onClick={handleApplyPromo}
                        >
                          Apply
                        </button>
                      </div>
                      {promoError && <p className={styles.promoError}>{promoError}</p>}
                      {promoSuccess && <p className={styles.promoSuccessText}>{promoSuccess}</p>}
                    </div>
                  )}
                </>
              )}
            </div>

            <label className={styles.termsLabel}>
              <div className={styles.checkboxWrapper}>
                <input 
                  type="checkbox" 
                  className={styles.termsCheckbox} 
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                />
              </div>
              <span className={styles.termsText}>
                Agree to <Link href="/terms" className={styles.underline}>terms</Link> of sale as per the merchants terms of service.
              </span>
            </label>

            <button 
              className={`btn btn-primary ${styles.checkoutBtn} ${!agreedToTerms ? styles.disabledBtn : ""}`}
              onClick={(e) => {
                if (!agreedToTerms) {
                  e.preventDefault();
                  toast.error("Please agree to the terms of sale before proceeding to checkout.");
                } else if (!user) {
                  toast.error("Sign in or create an account to proceed to checkout.", {
                    description: "Head to your account page to sign in or sign up.",
                    action: { label: "Account", onClick: () => { window.location.href = "/account"; } },
                  });
                } else {
                  window.location.href = "/checkout";
                }
              }}
            >
              CHECKOUT
            </button>
          </div>
        </div>

      </div>
      </div>
    </div>
  );
}
