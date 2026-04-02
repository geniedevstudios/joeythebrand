import Link from "next/link";
import styles from "./FeaturedSection.module.css";

const featured = [
  {
    id: "structured-blazer",
    name: "The Structured Blazer",
    category: "ALWAYS LIT",
    price: "GHC 850",
    image: "/lookbook.png",
    tag: "Bestseller",
  },
  {
    id: "identity-coat",
    name: "The Identity Coat",
    category: "LIMITED-EDITION",
    price: "GHC 1,200",
    image: "/lookbook.png",
    tag: "Limited",
  },
  {
    id: "presence-set",
    name: "The Presence Set",
    category: "ALWAYS LIT",
    price: "GHC 980",
    image: "/lookbook.png",
    tag: null,
  },
  {
    id: "heritage-knit",
    name: "The Heritage Knit",
    category: "SEASONAL",
    price: "GHC 750",
    image: "/lookbook.png",
    tag: "New",
  },
  {
    id: "form-trousers",
    name: "The Form Trousers",
    category: "ALWAYS LIT",
    price: "GHC 620",
    image: "/lookbook.png",
    tag: null,
  },
];

export default function FeaturedSection() {
  return (
    <section className={`section ${styles.featured}`} id="featured">
      <div className="container">
        <div className={styles.header}>
          <div>
            <span className="section-label">The Collection</span>
            <h2 className={`t-heading ${styles.heading}`}>Pieces that speak first.</h2>
          </div>
          <Link href="/collection" className={`btn btn-outline ${styles.viewAll}`} id="featured-view-all">
            View Full Collection
          </Link>
        </div>

        <div className={styles.grid}>
          {featured.map((item) => (
            <article key={item.id} className={styles.card}>
              <div className={styles.imageWrap}>
                <img
                  src={item.image}
                  alt={item.name}
                  className={styles.image}
                  loading="lazy"
                />
                {item.tag && (
                  <span className={styles.tag}>{item.tag}</span>
                )}
                <div className={styles.overlay}>
                  <Link
                    href="/collection"
                    className={`btn btn-ghost btn-sm ${styles.quickView}`}
                    id={`featured-${item.id}`}
                  >
                    View Piece
                  </Link>
                </div>
              </div>
              <div className={styles.info}>
                <span className={styles.category}>{item.category}</span>
                <h3 className={styles.name}>{item.name}</h3>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
