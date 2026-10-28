"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ProductMedia from "@/components/shop/ProductMedia";
import { cartStore, type CartItem } from "@/store/cartStore";
import { authStore } from "@/store/authStore";
import { dataStore } from "@/lib/dataStore";
import { formatSizeLabel } from "@/lib/formatSizeLabel";
import styles from "./CartDrawer.module.css";

export const toggleCart = (state?: boolean) => {
  cartStore.toggleCart(state);
};

const EMPTY_ARRAY: CartItem[] = [];

const emptyPhrases = [
  { line1: "It's a little", line2: "empty here" },
  { line1: "Nothing to see", line2: "just yet" },
  { line1: "Your presence", line2: "is missing" },
  { line1: "Waiting on", line2: "your statement" },
  { line1: "The rack is", line2: "bare for now" },
  { line1: "No pieces", line2: "claimed yet" },
  { line1: "Time to", line2: "make a move" },
  { line1: "Power starts", line2: "with a pick" },
];

export default function CartDrawer() {
  const isOpen = useSyncExternalStore(cartStore.subscribe, cartStore.getIsOpen, () => false);
  const items = useSyncExternalStore(cartStore.subscribe, cartStore.getCart, () => EMPTY_ARRAY);
  const appliedPromo = useSyncExternalStore(cartStore.subscribe, cartStore.getAppliedPromo, () => null);
  const user = useSyncExternalStore(authStore.subscribe, authStore.getUser, () => null);
  const [emptyPhrase, setEmptyPhrase] = useState(emptyPhrases[0]);
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");
  const router = useRouter();

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") cartStore.toggleCart(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => {
        setEmptyPhrase(emptyPhrases[Math.floor(Math.random() * emptyPhrases.length)]);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      queueMicrotask(() => {
        setPromoInput("");
        setPromoError("");
        setPromoSuccess("");
      });
    }
  }, [isOpen]);

  const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const discount = appliedPromo?.discount || 0;
  const total = subtotal - discount;

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
    } catch {
      setPromoError("Failed to validate code. Please try again.");
    }
  };

  const handleRemovePromo = () => {
    cartStore.removePromotion();
    setPromoSuccess("");
  };

  return (
    <>
      {isOpen && (
        <div className={styles.backdrop} onClick={() => cartStore.toggleCart(false)} aria-hidden="true" />
      )}

      <div className={`${styles.drawer} ${isOpen ? styles.open : ""}`} role="dialog" aria-modal="true" aria-label="Shopping Cart">
        <div className={styles.header}>
          <h2 className={styles.title}>Your cart <sup>{items.length}</sup></h2>
          <button className={styles.closeBtn} onClick={() => cartStore.toggleCart(false)} aria-label="Close cart">
            &times;
          </button>
        </div>

        <div className={styles.drawerBody}>
          <div className={styles.content}>
            {items.length === 0 ? (
              <div className={styles.centeredEmpty}>
                <div className={styles.emptyTextGroup}>
                  <span className={styles.emptyLine}>{emptyPhrase.line1}</span>
                  <span className={styles.emptyLine}>
                    <em className={styles.emptyItalic}>{emptyPhrase.line2.split(" ")[0]}</em> {emptyPhrase.line2.split(" ").slice(1).join(" ")}
                  </span>
                </div>
                <p className={styles.emptySub}>Your cart is currently empty</p>
                <button 
                  className={styles.pillBtn} 
                  onClick={() => cartStore.toggleCart(false)}
                >
                  START SHOPPING
                </button>
              </div>
            ) : (
              <div className={styles.itemsList}>
                {items.map((item) => (
                  <div key={item.id} className={styles.cartItem}>
                    <div className={styles.itemImagesGrid}>
                      <div className={styles.itemImageWrap}>
                        <ProductMedia src={item.image} alt={item.name} className={styles.itemImage} />
                      </div>
                      <div className={styles.itemImageWrap}>
                        <ProductMedia src={item.image2 || item.image} alt={`${item.name} alternate`} className={styles.itemImage} />
                      </div>
                    </div>
                    
                    <div className={styles.itemDetails}>
                      <h3 className={styles.itemName}>{item.name.toUpperCase()}</h3>
                      <p className={styles.itemPrice}>GHC {item.price.toLocaleString()}</p>
                      
                      <div className={styles.itemVariantsList}>
                        {(item.color || item.colorHex) && (
                          <p className={styles.itemVariantText}>
                            Color: {item.color}
                          </p>
                        )}
                        {item.combo && <p className={styles.itemVariantText}>Combo: {item.combo}</p>}
                        <p className={styles.itemVariantText}>
                          Size: {formatSizeLabel(item.size, item.fit, item.wearTag)}{item.fit ? ` — ${item.fit} Fit` : ""}
                        </p>
                      </div>

                      {(item.isMadeToOrder || item.isBespoke) && (
                        <p className={styles.bespokeTag}>
                          Made to Order · {item.leadDays || item.bespokeLeadDays || 14} days
                        </p>
                      )}

                      <div className={styles.controlsRow}>
                        <div className={styles.qtyBox}>
                          <button className={styles.qtyBoxBtn} onClick={() => handleUpdateQuantity(item.id, -1)}>-</button>
                          <span className={styles.qtyBoxVal}>{item.quantity}</span>
                          <button 
                            className={styles.qtyBoxBtn} 
                            onClick={() => handleUpdateQuantity(item.id, 1)}
                            disabled={item.quantity >= (item.maxStock ?? 999)}
                            title={item.quantity >= (item.maxStock ?? 999) ? "Max stock reached" : ""}
                          >
                            +
                          </button>
                        </div>
                        <button className={styles.removeIconBtn} onClick={() => handleRemove(item.id)} aria-label="Remove item">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                      
                      <div className={styles.itemTotal}>
                        Total: GHC {(item.price * item.quantity).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className={styles.footer}>
              <div className={styles.promoSection}>
                {appliedPromo ? (
                  <div className={styles.appliedPromo}>
                    <span className={styles.promoCode}>{appliedPromo.code}</span>
                    <span className={styles.promoDiscount}>-{appliedPromo.percentage}%</span>
                    <button className={styles.removePromoBtn} onClick={handleRemovePromo}>Remove</button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyPromo} className={styles.promoForm}>
                    <input
                      type="text"
                      placeholder="Enter promo code"
                      className={styles.promoInput}
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                    />
                    <button type="submit" className={styles.promoApplyBtn}>Apply</button>
                  </form>
                )}
                {promoError && <p className={styles.promoError}>{promoError}</p>}
                {promoSuccess && <p className={styles.promoSuccess}>{promoSuccess}</p>}
              </div>

              <div className={styles.subtotalBlock}>
                <div className={styles.subtotalRow}>
                  <span className={styles.subtotalLabel}>Subtotal</span>
                  <span className={styles.subtotalValue}>GHC {subtotal.toLocaleString()}</span>
                </div>

                {discount > 0 && (
                  <div className={styles.subtotalRow} style={{ color: "#22aa22" }}>
                    <span className={styles.subtotalLabel}>Discount ({appliedPromo?.code})</span>
                    <span className={styles.subtotalValue}>-GHC {discount.toLocaleString()}</span>
                  </div>
                )}

                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>Total</span>
                  <span className={styles.totalValue}>GHC {total.toLocaleString()}</span>
                </div>
                <p className={styles.taxesNote}>
                  Taxes included. <Link href="/shipping" style={{textDecoration: 'underline'}}>Shipping</Link> calculated at checkout.
                </p>
              </div>
              
              <div className={styles.actionButtonsCol}>
                <Link href="/cart" className={styles.viewCartBtn} onClick={() => cartStore.toggleCart(false)}>
                  VIEW CART
                </Link>
                <button
                  className={styles.checkoutBtn}
                  onClick={() => {
                    if (!user) {
                      toast.error("Sign in or create an account to proceed to checkout.", {
                        description: "Head to your account page to sign in or sign up.",
                        action: { label: "Account", onClick: () => { cartStore.toggleCart(false); router.push("/account"); } },
                      });
                    } else {
                      cartStore.toggleCart(false);
                      router.push("/checkout");
                    }
                  }}
                >
                  CHECKOUT
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
