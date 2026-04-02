import styles from "./ValuesSection.module.css";

const values = [
  {
    id: "power",
    title: "POWER",
    body: "We design for presence. Every silhouette is intentional.",
    icon: "⚡",
  },
  {
    id: "craftsmanship",
    title: "CRAFTSMANSHIP",
    body: "Precision tailoring. Clean finishing. Elevated structure.",
    icon: "✦",
  },
  {
    id: "identity",
    title: "IDENTITY",
    body: "We honor culture, symbolism, and individuality.",
    icon: "◈",
  },
  {
    id: "excellence",
    title: "EXCELLENCE",
    body: "No compromise. No shortcuts. Only refined execution.",
    icon: "◉",
  },
];

export default function ValuesSection() {
  return (
    <section className={`section section-warm ${styles.values}`} id="values">
      <div className="container">
        <div className={styles.header}>
          <span className="section-label">Brand Values</span>
          <h2 className={`t-heading ${styles.heading}`}>
            What we stand for
          </h2>
        </div>

        <div className={styles.grid}>
          {values.map((v, i) => (
            <div key={v.id} className={styles.card} id={`value-${v.id}`}>
              <div className={styles.cardTop}>
                <span className={styles.icon} aria-hidden="true">{v.icon}</span>
                <span className={styles.index}>0{i + 1}</span>
              </div>
              <h3 className={styles.cardTitle}>{v.title}</h3>
              <p className={styles.cardBody}>{v.body}</p>
              <div className={styles.cardLine} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
