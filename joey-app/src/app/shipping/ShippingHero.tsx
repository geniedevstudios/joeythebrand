import styles from "./shipping.module.css";

export default function ShippingHero({ children }: { children: React.ReactNode }) {
  return <div className={styles.header}>{children}</div>;
}
