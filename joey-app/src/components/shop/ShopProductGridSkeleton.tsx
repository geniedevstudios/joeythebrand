import styles from "@/app/shop/ShopClient.module.css";

type Props = {
  count?: number;
};

/**
 * Mirrors the shop product card layout (image 3:4, label, title, meta) so height
 * stays stable when real products replace the skeleton.
 */
export function ShopProductGridSkeleton({ count = 6 }: Props) {
  return (
    <div className={styles.grid} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <article key={i} className={styles.card}>
          <div className={styles.imageWrapOuter}>
            <div className={`${styles.skeletonImageFill} skeleton`} />
          </div>
          <div className={styles.info}>
            <div className="skeleton" style={{ height: 11, width: "42%", borderRadius: 4 }} />
            <div className="skeleton" style={{ height: 22, width: "88%", borderRadius: 6, marginTop: 2 }} />
            <div className="skeleton" style={{ height: 16, width: "38%", borderRadius: 4, marginTop: 8 }} />
          </div>
        </article>
      ))}
    </div>
  );
}
