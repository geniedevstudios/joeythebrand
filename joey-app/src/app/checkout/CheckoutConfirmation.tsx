import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Check, Clock3 } from "lucide-react";
import { formatOrderNumber } from "@/lib/formatOrderNumber";
import type { Order } from "@/lib/types";
import { formatOrderAmount } from "@/lib/formatOrderAmount";
import styles from "./CheckoutClient.module.css";

export type ConfirmedCheckout = {
  order: Order;
  amountPaid: number;
  deliveryMethod: string;
  deliveryAddress: string;
  deliveryFeePending: boolean;
  needsReview: boolean;
};

export default function CheckoutConfirmation({ confirmation }: { confirmation: ConfirmedCheckout }) {
  const { order, amountPaid, deliveryMethod, deliveryAddress, deliveryFeePending, needsReview } = confirmation;
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    window.scrollTo(0, 0);
    title.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className={styles.page}>
      <section className={`${styles.shell} ${styles.confirmation}`} aria-labelledby="confirmation-title">
        <div className={styles.confirmationIntro}>
          <span className={styles.confirmationMark} aria-hidden="true">
            {needsReview ? <Clock3 size={24} /> : <Check size={24} />}
          </span>
          <h1 id="confirmation-title" className={styles.pageTitle} ref={title} tabIndex={-1}>
            {needsReview ? "Payment received" : "Order confirmed"}
          </h1>
          <p>{needsReview
            ? "We’re reviewing an item’s availability. Check your account for updates."
            : "Thank you for shopping with Joey. You can follow your order from your account."}</p>
        </div>

        <div className={styles.confirmationReceipt}>
          <dl className={styles.receiptMeta}>
            <div>
              <dt>Order number</dt>
              <dd>{formatOrderNumber(order)}</dd>
            </div>
            <div>
              <dt>Amount paid</dt>
              <dd>{formatOrderAmount(amountPaid)}</dd>
            </div>
          </dl>
          <div className={styles.receiptDelivery}>
            <h2>Delivery</h2>
            <p><strong>{deliveryMethod}</strong></p>
            {order.customerName && <p>{order.customerName}</p>}
            <p>{deliveryAddress}</p>
            {deliveryFeePending && <p className={styles.receiptNote}>Our team will contact you to confirm the delivery fee and timing.</p>}
          </div>
        </div>

        <div className={styles.confirmationActions}>
          <Link href="/account" className={styles.primaryButton}>View my account <ArrowRight size={16} aria-hidden="true" /></Link>
          <Link href="/shop" className={styles.secondaryButton}>Continue shopping</Link>
        </div>
      </section>
    </div>
  );
}
