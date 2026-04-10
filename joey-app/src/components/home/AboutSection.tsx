import styles from "./AboutSection.module.css";

export default function AboutSection() {
  return (
    <section className={`section ${styles.about}`} id="about">
      <div className="container">
        <div className={styles.grid}>
          {/* Text */}
          <div className={styles.textCol}>
            <span className="section-label">About The Brand</span>
            <h2 className={`t-display ${styles.heading}`}>
              More than fashion —<br />
              <em>identity stitched into form.</em>
            </h2>
            <div className={styles.body}>
              <p>
                Founded on the belief that clothing should command presence before a word is spoken,
                JOEY THE BRAND merges architectural tailoring with cultural depth. Each piece is crafted
                to embody strength, elegance, and intentional design.
              </p>
              <p>
                Rooted in bold structure and refined minimalism, JOEY THE BRAND exists for individuals
                who understand that style is not decoration — it is declaration.
              </p>
            </div>

            {/* Pull quote */}
            <blockquote className={styles.quote}>
              <span className={styles.quoteText}>
                "Style is not decoration — it is declaration."
              </span>
              <span className={styles.quoteMark}>"</span>
            </blockquote>

            <p className={styles.signoff}>Power worn well.</p>
          </div>

          {/* Visual accent col */}
          <div className={styles.visualCol} aria-hidden="true">
            <div className={styles.accentBlock}>
              <div className={styles.accentInner}>
                <p className={styles.accentStat}>Est.</p>
                <p className={styles.accentYear}>Accra</p>
                <p className={styles.accentLabel}>Ghana</p>
              </div>
            </div>
            <div className={styles.accentDot} />
          </div>
        </div>
      </div>
    </section>
  );
}
