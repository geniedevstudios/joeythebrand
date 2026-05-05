import type { Metadata } from "next";
import Link from "next/link";
import styles from "./shipping.module.css";
import ShippingHero from "./ShippingHero";

export const metadata: Metadata = {
  title: "Shipping & Returns Policy",
  description: "Information on domestic (Ghana) and international shipping, delivery times, and our return policy.",
};

export default function ShippingPage() {
  return (
    <div className={styles.page}>
      <ShippingHero>
        <div className="container">
          <span className="section-label" style={{ color: "var(--cinereous)" }}>Policies</span>
          <h1 className={`t-display ${styles.title}`}>Shipping & Returns</h1>
        </div>
      </ShippingHero>

      <div className="container">
        <div className={styles.content}>
          <section className={styles.section}>
            <h2 className={styles.heading}>Processing Time</h2>
            <p>
              Due to the nature of our work, many pieces are made-to-order or produced in extremely limited runs. 
              Standard processing time for ready-to-wear items is <strong>3–5 business days</strong>. 
              Always Lit pieces hold consistent stock, while Limited Edition pieces may require slightly longer 
              processing times as they are finished with precision before dispatch.
            </p>
            <p>
              Bespoke or custom orders have individual timelines discussed during your consultation.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.heading}>Domestic Shipping (Ghana)</h2>
            <p>
              We deliver locally across Ghana. 
              Deliveries within Accra typically take <strong>1–2 business days</strong> after processing. 
              Deliveries to other regions in Ghana take <strong>2–4 business days</strong>.
            </p>
            <p>
              Local dispatch is handled via secure courier, and you will be contacted on the day of delivery.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.heading}>International Shipping</h2>
            <p>
              We ship worldwide. International orders are handled via priority mail (DHL). 
              Delivery times vary by region but generally fall between <strong>5–10 business days</strong> after dispatch.
            </p>
            <p>
              <em>Customs and Duties:</em> International shipments may be subject to customs duties, taxes, or import fees levied by the destination country. 
              These charges are the sole responsibility of the customer.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.heading}>Returns & Exchanges</h2>
            <p>
              We accept returns or exchanges within <strong>7 days</strong> of delivery, provided the garment is in its original, unworn, unwashed, and undamaged condition with all tags attached.
            </p>
            <p>
              <em>Non-returnable Items:</em> Bespoke, custom-sized, or sample sale pieces are final sale and cannot be returned or exchanged.
            </p>
            <p>
              To initiate a return or exchange, please <Link href="/contact" className={styles.inlineLink}>contact us</Link> with your order details. The customer is responsible for return shipping costs unless the item arrived defective or incorrect.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
