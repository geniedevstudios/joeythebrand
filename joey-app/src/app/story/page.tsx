import type { Metadata } from "next";
import Link from "next/link";
import styles from "./story.module.css";
import StoryHero from "./StoryHero";

export const metadata: Metadata = {
  title: "Our Story — JOEY THE BRAND",
  description: "The story behind JOEY THE BRAND — a contemporary fashion house born in Accra, Ghana, built on power, craftsmanship, identity and excellence.",
};

const values = [
  { title: "POWER", body: "We design for presence. Every silhouette is intentional." },
  { title: "CRAFTSMANSHIP", body: "Precision tailoring. Clean finishing. Elevated structure." },
  { title: "IDENTITY", body: "We honor culture, symbolism, and individuality." },
  { title: "EXCELLENCE", body: "No compromise. No shortcuts. Only refined execution." },
];

export default function StoryPage() {
  return (
    <div className={styles.page}>
      <StoryHero>
        <div className="container">
          <span className="section-label">About The Brand</span>
          <h1 className={`t-heading ${styles.heroTitle}`}>
            More than fashion —<br /><em>identity stitched into form.</em>
          </h1>
          <p className={styles.heroSubtext}>
            JOEY THE BRAND is a contemporary fashion house redefining modern silhouettes through structure, symbolism, and unapologetic identity.
          </p>
        </div>
      </StoryHero>

      {/* Brand Manifesto */}
      <section className={`section ${styles.manifesto}`}>
        <div className="container">
          <div className={styles.manifestoGrid}>
              <div className={styles.manifestoBody}>
                <p>
                  JOEY THE BRAND is more than fashion — it is identity stitched into form.
                  Founded on the belief that clothing should command presence before a word
                  is spoken, the brand merges architectural tailoring with cultural depth.
                </p>
                <p>
                  Each piece is crafted to embody strength, elegance, and intentional design.
                  Rooted in bold structure and refined minimalism, JOEY THE BRAND exists for
                  individuals who understand that style is not decoration — it is declaration.
                </p>
                <p>
                  Born and built in Accra, Ghana, our work draws from the richness of African
                  symbolism, the discipline of modern tailoring, and the audacity of
                  contemporary storytelling.
                </p>
              </div>
            <div className={styles.manifestoQuote}>
              <blockquote className={styles.bigQuote}>
                &ldquo;Style is not<br />
                decoration —<br />
                it is <em>declaration.</em>&rdquo;
              </blockquote>
              <p className={styles.quoteAttrib}>— JOEY THE BRAND</p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className={`section section-dark ${styles.valuesSection}`}>
        <div className="container">
          <span className="section-label" style={{ color: "var(--cinereous)" }}>What We Stand For</span>
          <h2 className={`t-heading ${styles.valuesHeading}`}>Brand Values</h2>
          <div className={styles.valuesGrid}>
            {values.map((v, i) => (
              <div key={v.title} className={styles.valueItem}>
                <span className={styles.valueNum}>0{i + 1}</span>
                <h3 className={styles.valueTitle}>{v.title}</h3>
                <p className={styles.valueBody}>{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder */}
      <section className={`section ${styles.founderSection}`}>
        <div className="container">
          <div className={styles.founderGrid}>
            <div className={styles.founderImageWrap}>
              <img src="/founder.png" alt="Joey — Founder" className={styles.founderImage} />
            </div>
            <div className={styles.founderText}>
              <span className="section-label">About The Founder</span>
              <h2 className={`t-heading ${styles.founderHeading}`}>Meet <em>Joey.</em></h2>
              <div className={styles.founderBody}>
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
                <p>
                  Fashion is not just worn. It is built.
                </p>
              </div>
              <a 
                href="https://consultwithurtailorstailor.joeythebrand.com/" 
                className="btn btn-primary" 
                id="story-bespoke-cta"
                target="_blank"
                rel="noopener noreferrer"
              >
                Work With Joey
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className={styles.ctaBanner}>
        <div className="container">
          <div className={styles.ctaInner}>
            <h2 className={`t-display ${styles.ctaHeading}`}>
              Power worn well.
            </h2>
            <div className={styles.ctaBtns}>
              <Link href="/shop" className="btn btn-primary btn-lg" id="story-shop-cta">
                Shop The Collection
              </Link>
              <Link href="/contact" className="btn btn-ghost btn-lg" id="story-contact-cta">
                Get In Touch
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
