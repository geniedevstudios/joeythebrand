import Image from "next/image";
import styles from "./CuratedPill.module.css";

const CuratedInner = () => (
  <>
    <span className={styles.curatedLabel}>Curated by</span>
    <Image
      src="/emoji-genie-apple.png"
      alt="Developer emoji"
      width={24}
      height={24}
      className={styles.genieImg}
      aria-hidden
      unoptimized
    />
    <span className={styles.curatedSep}>|</span>
    <span className={styles.devWord}>dev</span>
  </>
);

export default function CuratedPill({ devHref }: { devHref: string | null }) {
  if (devHref) {
    return (
      <a
        href={devHref}
        className={styles.curatedPill}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Developer portfolio — curated by"
      >
        <CuratedInner />
      </a>
    );
  }
  return (
    <span className={`${styles.curatedPill} ${styles.curatedPillInactive}`} title="Developer Portfolio">
      <CuratedInner />
    </span>
  );
}

