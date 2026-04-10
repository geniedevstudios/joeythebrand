import styles from "./MirrorCube.module.css";

export default function MirrorCube() {
  return (
    <div className={styles.scene} aria-hidden="true">
      <div className={styles.halo} />
      <div className={styles.cube}>
        <div className={`${styles.face} ${styles.front}`} />
        <div className={`${styles.face} ${styles.back}`} />
        <div className={`${styles.face} ${styles.right}`} />
        <div className={`${styles.face} ${styles.left}`} />
        <div className={`${styles.face} ${styles.top}`} />
        <div className={`${styles.face} ${styles.bottom}`} />
      </div>
      <div className={styles.shadow} />
    </div>
  );
}
