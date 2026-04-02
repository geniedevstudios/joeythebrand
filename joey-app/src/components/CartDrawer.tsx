"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { cartStore } from "@/store/cartStore";
import { dataStore } from "@/lib/dataStore";
import styles from "./CartDrawer.module.css";

export const toggleCart = (state?: boolean) => {
  cartStore.toggleCart(state);
};

const EMPTY_ARRAY: any[] = [];

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
  const [emptyPhrase, setEmptyPhrase] = useState(emptyPhrases[0]);
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") cartStore.toggleCart(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setEmptyPhrase(emptyPhrases[Math.floor(Math.random() * emptyPhrases.length)]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setPromoInput("");
      setPromoError("");
      setPromoSuccess("");
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

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError("");
    setPromoSuccess("");
    
    if (!promoInput.trim()) return;
    
    const promo = dataStore.getPromotion(promoInput);
    if (!promo) {
      setPromoError("Invalid promo code");
      return;
    }
    
    if (!promo.active) {
      setPromoError("This promo code is no longer active");
      return;
    }
    
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
      setPromoError("This promo code has expired");
      return;
    }
    
    cartStore.applyPromotion(promo.code, promo.percentage);
    setPromoSuccess(`Code applied! ${promo.percentage}% off`);
    setPromoInput("");
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
                  <div className={styles.itemImageWrap}>
                    <img src={item.image} alt={item.name} className={styles.itemImage} />
                  </div>
                  
                  <div className={styles.itemDetails}>
                    <h3 className={styles.itemName}>{item.name.toUpperCase()}</h3>
                    <p className={styles.itemUnit}>GHC {item.price}</p>
                    <p className={styles.itemSize}>{item.size}</p>
                  </div>
                  
                  <div className={styles.itemControls}>
                    <div className={styles.qtyBox}>
                      <button className={styles.qtyBoxBtn} onClick={() => handleUpdateQuantity(item.id, -1)}>-</button>
                      <span className={styles.qtyBoxVal}>{item.quantity}</span>
                      <button className={styles.qtyBoxBtn} onClick={() => handleUpdateQuantity(item.id, 1)}>+</button>
                    </div>
                    <button className={styles.removeBtn} onClick={() => handleRemove(item.id)}>Remove</button>
                    <div className={styles.itemTotal}>
                      GHC {(item.price * item.quantity).toLocaleString()}
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

            <div className={styles.subtotalRow}>
              <div className={styles.subtotalLeft}>
                <span className={styles.subtotalLabel}>Subtotal</span>
                <p className={styles.taxesNote}>
                  Taxes included. <Link href="/shipping" style={{textDecoration: 'underline', color: 'inherit'}}>Shipping</Link> calculated at checkout.
                </p>
              </div>
              <span className={styles.subtotalValue}>GHC {subtotal.toLocaleString()}</span>
            </div>

            {discount > 0 && (
              <div className={styles.subtotalRow} style={{ color: "#22aa22" }}>
                <span className={styles.subtotalLabel}>Discount ({appliedPromo?.code})</span>
                <span className={styles.subtotalValue}>-GHC {discount.toLocaleString()}</span>
              </div>
            )}

            <div className={styles.subtotalRow}>
              <div className={styles.subtotalLeft}>
                <span className={styles.subtotalLabel} style={{ fontWeight: "600", fontSize: "16px" }}>Total</span>
              </div>
              <span className={styles.subtotalValue} style={{ fontWeight: "600", fontSize: "18px" }}>GHC {total.toLocaleString()}</span>
            </div>
            
            <div className={styles.actionButtonsRow}>
              <Link href="/cart" className={styles.viewCartBtn} onClick={() => cartStore.toggleCart(false)}>
                VIEW CART
              </Link>
              <Link href="/checkout" className={styles.checkoutBtn} onClick={() => cartStore.toggleCart(false)}>
                CHECKOUT
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
