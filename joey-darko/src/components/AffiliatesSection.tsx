import { AFFILIATE_NAMES } from "@/lib/affiliatesData";
import styles from "./AffiliatesSection.module.css";

export default function AffiliatesSection() {
  return (
    <section className={styles.section} aria-label="Brands and institutional collaborations">
      <div className={`container ${styles.inner}`}>
        <p className={styles.label}>Collaborations</p>
        <h2 className={`t-section-heading ${styles.title}`}>Brands &amp; affiliates</h2>
        <p className={styles.lead}>
          A selection of labels, programmes, and partners from recent work and ongoing relationships.
        </p>
        <ul className={styles.grid}>
          {AFFILIATE_NAMES.map((name) => (
            <li key={name} className={styles.cell}>
              {name}
            </li>
          ))}
        </ul>

        <div className={styles.ctaBelow}>
          <p className={styles.ctaText}>
            Want your brand on this wall? Reach out — we&apos;d love to place you in the grid.
          </p>
          <a href="#contact" className={styles.pointerLink} aria-label="Go to contact section">
            <span className={styles.pointerIcon} aria-hidden>
              <svg viewBox="0 0 48 88" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.pointerSvg}>
                <circle cx="24" cy="14" r="5" stroke="currentColor" strokeWidth="2.25" fill="none" />
                <path
                  d="M24 22v34M11 42l13 20 13-20"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
