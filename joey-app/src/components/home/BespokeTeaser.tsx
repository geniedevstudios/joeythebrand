import Link from "next/link";
import styles from "./BespokeTeaser.module.css";

export default function BespokeTeaser() {
  return (
    <section className={`section-sm ${styles.bespoke}`} id="bespoke-teaser">
      <div className="container">
        <div className={styles.inner}>
          <div className={styles.textCol}>
            <span className="section-label">Consultancy</span>
            <h2 className={`t-display ${styles.heading}`}>
              Something made for <em>only you.</em>
            </h2>
            <p className={styles.body}>
              For clan members who desire exclusivity — our bespoke service crafts garments
              around your presence and personality. From consultation to final fitting,
              every detail is refined for you.
            </p>
            <p className={styles.note}>By appointment only.</p>
            <div className={styles.ctas}>
              <Link href="/bespoke" className="btn btn-primary btn-lg" id="bespoke-book-cta">
                Book A Slot
              </Link>

            </div>
          </div>

          {/* Decorative right panel */}
          <div className={styles.decorCol} aria-hidden="true">
            <div className={styles.decorBlock}>
              <div className={styles.decorLines}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className={styles.decorLine} style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <p className={styles.decorText}>Crafted for you.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
