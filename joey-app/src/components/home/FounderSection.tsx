import styles from "./FounderSection.module.css";

export default function FounderSection() {
  return (
    <section className={`section section-dark ${styles.founder}`} id="founder">
      <div className="container">
        <div className={styles.grid}>
          {/* Image */}
          <div className={styles.imageCol}>
            <div className={styles.imageFrame}>
              <img src="/founder.png" alt="Joey — Founder of JOEY THE BRAND" className={styles.image} />
            </div>
            <div className={styles.imageBadge}>
              <span className={styles.badgeText}>Founded in Accra</span>
            </div>
          </div>

          {/* Text */}
          <div className={styles.textCol}>
            <span className="section-label" style={{ color: "var(--cinereous)" }}>
              About The Founder
            </span>
            <h2 className={`t-display ${styles.heading}`}>
              Meet <em>Joey.</em>
            </h2>

            <div className={styles.body}>
              <p>
                Joey is a designer and fashion consultant driven by one mission: to build garments
                that speak authority. With a sharp eye for structure and a deep respect for symbolism,
                Joey approaches fashion as both art and strategy.
              </p>
              <p>
                Each collection reflects a fusion of modern tailoring, African influence, and
                contemporary storytelling. Beyond design, Joey is passionate about empowering
                fashion founders and creatives to build profitable, purpose-driven brands.
              </p>
            </div>

            <blockquote className={styles.quote}>
              Fashion is not just worn. It is built.
            </blockquote>

            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statNum}>3</span>
                <span className={styles.statLabel}>Collections</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <span className={styles.statNum}>100+</span>
                <span className={styles.statLabel}>Bespoke Clients</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <span className={styles.statNum}>GH</span>
                <span className={styles.statLabel}>Accra, Ghana</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
