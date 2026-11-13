"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Minus, Plus, ShoppingBag } from "lucide-react";
import styles from "./CartClient.module.css";
import PageHeroShellImageLoader from "@/components/page-hero/PageHeroShellImageLoader";
import { PAGE_HERO_SHELL_CLASS, usePageHeroShellRenderProps } from "@/hooks/usePageHero";
import { cartStore, type CartItem } from "@/store/cartStore";
import { dataStore } from "@/lib/dataStore";
import { authStore } from "@/store/authStore";
import ProductMedia from "@/components/shop/ProductMedia";
import { formatSizeLabel } from "@/lib/formatSizeLabel";
import { formatOrderAmount } from "@/lib/formatOrderAmount";

const EMPTY_ARRAY: CartItem[] = [];

export default function CartClient() {
  const router = useRouter();
  const items = useSyncExternalStore(cartStore.subscribe, cartStore.getCart, () => EMPTY_ARRAY);
  const appliedPromo = useSyncExternalStore(cartStore.subscribe, cartStore.getAppliedPromo, () => null);
  const user = useSyncExternalStore(authStore.subscribe, authStore.getUser, () => null);
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [promoOpen, setPromoOpen] = useState(false);
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const termsCheckbox = useRef<HTMLInputElement>(null);

  const pieces = items.reduce((count, item) => count + item.quantity, 0);
  const subtotal = items.reduce((amount, item) => amount + item.price * item.quantity, 0);
  const discount = appliedPromo?.discount ?? 0;
  const hero = usePageHeroShellRenderProps("cart");

  async function handleApplyPromo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = promoInput.trim();
    if (!code || applyingPromo) return;

    setPromoError("");
    setApplyingPromo(true);
    try {
      const promo = await dataStore.validatePromoCode(code);
      if (!promo) {
        setPromoError("This promo code is invalid or inactive.");
        return;
      }
      cartStore.applyPromotion(promo.code, promo.percentage);
      setPromoInput("");
      setPromoOpen(false);
    } catch {
      setPromoError("Couldn’t check this code. Please try again.");
    } finally {
      setApplyingPromo(false);
    }
  }

  function handleCheckout() {
    if (!agreedToTerms) {
      setTermsError(true);
      termsCheckbox.current?.focus();
      return;
    }
    router.push(user ? "/checkout" : "/account");
  }

  return (
    <div className={styles.page}>
      <header
        className={`${PAGE_HERO_SHELL_CLASS} ${styles.header}`}
        data-page-hero-empty={hero.empty ? "true" : "false"}
        data-page-hero-loading={hero.shellSpinner ? "true" : "false"}
        data-page-hero-ready={hero.imageReady ? "true" : "false"}
        style={hero.style}
      >
        {hero.showImageLoader && <PageHeroShellImageLoader />}
        <div className={`${styles.shell} ${styles.heroContent}`}>
          {pieces > 0 && <Link href="/shop" className={styles.backLink}><ArrowLeft size={16} aria-hidden="true" /> Continue shopping</Link>}
          <div className={styles.heading}>
            <h1>Shopping bag</h1>
            {pieces > 0 && <span>{pieces} {pieces === 1 ? "piece" : "pieces"}</span>}
          </div>
        </div>
      </header>

      <div className={`${styles.shell} ${styles.content}`}>
        {items.length === 0 ? (
          <section className={styles.emptyState} aria-labelledby="empty-bag-title">
            <ShoppingBag size={28} strokeWidth={1.5} aria-hidden="true" />
            <h2 id="empty-bag-title" className={styles.sectionTitle}>Your bag is empty</h2>
            <Link href="/shop" className={styles.primaryButton}>Explore the shop <ArrowRight size={17} aria-hidden="true" /></Link>
          </section>
        ) : (
          <div className={styles.layout}>
            <ul className={styles.items} aria-label="Pieces in your bag">
              {items.map((item) => {
                const madeToOrder = item.isMadeToOrder || item.isBespoke || item.fulfillmentChoice === "made_to_order";
                const size = formatSizeLabel(item.size, item.fit, item.wearTag);
                return (
                  <li key={item.id} className={styles.item}>
                    <Link href={`/shop/${item.productId}`} className={styles.itemImage} aria-label={`View ${item.name}`}>
                      <ProductMedia src={item.image} alt="" className={styles.media} />
                    </Link>
                    <div className={styles.itemDetails}>
                      <Link href={`/shop/${item.productId}`} className={styles.itemName}>{item.name}</Link>
                      <p className={styles.itemVariant}>
                        {item.colorHex && <span className={styles.swatch} style={{ backgroundColor: item.colorHex }} aria-hidden="true" />}
                        {[item.color, item.combo, size && `Size ${size}`, item.fit && `${item.fit} fit`].filter(Boolean).join(" · ")}
                      </p>
                      {item.quantity > 1 && <p className={styles.unitPrice}>{formatOrderAmount(item.price)} each</p>}
                      {madeToOrder && <span className={styles.leadTime}>Made to Order · {item.leadDays || item.bespokeLeadDays || 14} days</span>}
                      <div className={styles.itemActions}>
                        <div className={styles.quantity} role="group" aria-label={`Quantity for ${item.name}`}>
                          <button type="button" aria-label={`Decrease quantity of ${item.name}`} onClick={() => cartStore.updateQuantity(item.id, -1)}>
                            <Minus size={15} aria-hidden="true" />
                          </button>
                          <span aria-live="polite">{item.quantity}</span>
                          <button type="button" aria-label={`Increase quantity of ${item.name}`} disabled={item.quantity >= (item.maxStock ?? 999)} onClick={() => cartStore.updateQuantity(item.id, 1)}>
                            <Plus size={15} aria-hidden="true" />
                          </button>
                        </div>
                        <button type="button" className={styles.textButton} aria-label={`Remove ${item.name}`} onClick={() => cartStore.removeItem(item.id)}>Remove</button>
                      </div>
                    </div>
                    <p className={styles.lineTotal} aria-label="Line total">{formatOrderAmount(item.price * item.quantity)}</p>
                  </li>
                );
              })}
            </ul>

            <aside className={styles.summary} aria-labelledby="bag-summary-title">
              <h2 id="bag-summary-title" className={styles.sectionTitle}>Order summary</h2>
              <dl className={styles.totals} aria-live="polite">
                {discount > 0 && (
                  <>
                    <div><dt>Subtotal</dt><dd>{formatOrderAmount(subtotal)}</dd></div>
                    <div><dt>Discount{appliedPromo && ` · ${appliedPromo.code}`}</dt><dd>−{formatOrderAmount(discount)}</dd></div>
                  </>
                )}
                <div className={styles.total}>
                  <dt>{discount > 0 ? "Subtotal after discount" : "Subtotal"}</dt>
                  <dd>{formatOrderAmount(subtotal - discount)}</dd>
                </div>
              </dl>
              <p className={styles.hint}>Taxes included. <Link href="/shipping">Delivery options</Link> are shown at checkout.</p>

              <div className={styles.promotion}>
                {appliedPromo ? (
                  <div className={styles.promoApplied}>
                    <span role="status"><strong>{appliedPromo.code}</strong> · {appliedPromo.percentage}% off</span>
                    <button type="button" className={styles.textButton} onClick={() => cartStore.removePromotion()}>Remove code</button>
                  </div>
                ) : (
                  <>
                    <button type="button" className={styles.promoToggle} aria-expanded={promoOpen} aria-controls="bag-promo-form"
                      onClick={() => { setPromoOpen(!promoOpen); setPromoError(""); }}>
                      Add a promo code {promoOpen ? <Minus size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
                    </button>
                    <form id="bag-promo-form" hidden={!promoOpen} onSubmit={handleApplyPromo}>
                      <div className={styles.promoFields}>
                        <input type="text" aria-label="Promo code" placeholder="Enter code" autoComplete="off"
                          disabled={applyingPromo} value={promoInput} onChange={(event) => { setPromoInput(event.target.value); setPromoError(""); }} />
                        <button type="submit" disabled={applyingPromo || !promoInput.trim()} className={styles.secondaryButton}>
                          {applyingPromo ? "Checking…" : "Apply"}
                        </button>
                      </div>
                      {promoError && <p role="alert" className={styles.error}>{promoError}</p>}
                    </form>
                  </>
                )}
              </div>

              <div className={styles.terms}>
                <input ref={termsCheckbox} id="bag-terms" type="checkbox" checked={agreedToTerms}
                  aria-invalid={termsError || undefined} aria-describedby={termsError ? "bag-terms-error" : undefined}
                  onChange={(event) => { setAgreedToTerms(event.target.checked); setTermsError(false); }} />
                <div>
                  <label htmlFor="bag-terms">I agree to the terms of sale.</label>{" "}
                  <Link href="/terms">Read terms</Link>
                </div>
              </div>
              {termsError && <p className={styles.error} id="bag-terms-error" role="alert">Please agree to the terms of sale to continue.</p>}
              <button type="button" className={styles.primaryButton} onClick={handleCheckout}>
                {user ? "Continue to checkout" : "Sign in to check out"} <ArrowRight size={17} aria-hidden="true" />
              </button>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
