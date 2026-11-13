import { ArrowRight, LockKeyhole } from "lucide-react";
import ProductMedia from "@/components/shop/ProductMedia";
import { formatSizeLabel } from "@/lib/formatSizeLabel";
import { formatOrderAmount } from "@/lib/formatOrderAmount";
import type { CartItem } from "@/store/cartStore";
import styles from "./CheckoutClient.module.css";

function madeToOrder(item: CartItem) {
  return Boolean(item.isMadeToOrder || item.isBespoke || item.fulfillmentChoice === "made_to_order");
}

type Props = {
  items: CartItem[];
  subtotal: number;
  discount: number;
  promoCode?: string;
  shippingCost: number | null;
  total: number;
  submitting: boolean;
};

export default function CheckoutSummary({ items, subtotal, discount, promoCode, shippingCost, total, submitting }: Props) {
  const pieces = items.reduce((count, item) => count + item.quantity, 0);
  const productionDays = items.reduce((days, item) =>
    madeToOrder(item) ? Math.max(days, item.leadDays || item.bespokeLeadDays || 14) : days, 0);

  return (
    <aside className={styles.summarySection} aria-labelledby="order-summary-title">
      <div className={styles.summaryHeader}>
        <h2 id="order-summary-title" className={styles.sectionTitle}>Order summary</h2>
        <span>{pieces} {pieces === 1 ? "piece" : "pieces"}</span>
      </div>
      <ul className={styles.itemsList}>
        {items.map((item) => (
          <li key={item.id} className={styles.summaryItem}>
            <div className={styles.itemImgWrap}>
              <ProductMedia src={item.image} alt="" className={styles.itemImg} />
            </div>
            <div className={styles.itemInfo}>
              <span className={styles.itemName}>{item.name}</span>
              <span className={styles.itemVariant}>
                {item.colorHex && <span className={styles.itemSwatch} style={{ backgroundColor: item.colorHex }} aria-hidden="true" />}
                {[item.color, item.combo, formatSizeLabel(item.size, item.fit, item.wearTag), item.fit && `${item.fit} fit`, `Qty ${item.quantity}`].filter(Boolean).join(" · ")}
              </span>
              {madeToOrder(item) && <span className={styles.itemLead}>Made to Order</span>}
            </div>
            <span className={styles.itemPrice}>{formatOrderAmount(item.price * item.quantity)}</span>
          </li>
        ))}
      </ul>
      {productionDays > 0 && (
        <p className={styles.summaryNotice}>
          <strong>Made to Order · {productionDays} days</strong>
          {items.some((item) => !madeToOrder(item))
            ? "Your pieces will ship together once production is complete."
            : "Production begins once payment is verified."}
        </p>
      )}
      <dl className={styles.totals} aria-live="polite">
        <div><dt>Subtotal</dt><dd>{formatOrderAmount(subtotal)}</dd></div>
        {discount > 0 && <div><dt>Discount{promoCode && ` · ${promoCode}`}</dt><dd>−{formatOrderAmount(discount)}</dd></div>}
        <div><dt>Delivery</dt><dd>{shippingCost === null ? "To be confirmed" : formatOrderAmount(shippingCost)}</dd></div>
        <div className={styles.totalFinal}><dt>{shippingCost === null ? "Due now" : "Total"}</dt><dd>{formatOrderAmount(total)}</dd></div>
      </dl>
      {shippingCost === null && <p className={styles.deliveryNote}>Our team will contact you to confirm the delivery fee and timing.</p>}
      <button className={styles.primaryButton} type="submit" form="checkout-form" disabled={submitting}>
        {submitting ? "Processing…" : "Place order"}
        {!submitting && <ArrowRight size={17} aria-hidden="true" />}
      </button>
      <p className={styles.securePayment}><LockKeyhole size={14} aria-hidden="true" /> Payment handled by Paystack</p>
    </aside>
  );
}
