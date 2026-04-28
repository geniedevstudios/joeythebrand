"use client";

import { useRouter } from "next/navigation";
import styles from "../events.module.css";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className={`${styles.crumbLink} ${styles.crumbBackBtn}`}
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push("/events");
        }
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={styles.crumbBackIcon}
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      Back
    </button>
  );
}

