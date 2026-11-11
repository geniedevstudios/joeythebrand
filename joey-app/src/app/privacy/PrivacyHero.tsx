import styles from "../shipping/shipping.module.css";

export default function PrivacyHero({ children }: { children: React.ReactNode }) {
  return <div className={styles.header}>{children}</div>;
}
