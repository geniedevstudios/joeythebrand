"use client";

import { useState } from "react";
import styles from "./ValuesSection.module.css";
import { ChevronDown, ChevronUp } from "lucide-react";

import Image from "next/image";

const values = [
  {
    id: "power",
    title: "POWER",
    body: "We design for presence. Every silhouette is intentional.",
    image: "/values/power.jpeg",
  },
  {
    id: "craftsmanship",
    title: "CRAFTSMANSHIP",
    body: "Precision tailoring. Clean finishing. Elevated structure.",
    image: "/values/craftsmanship.jpeg",
  },
  {
    id: "identity",
    title: "IDENTITY",
    body: "We honor culture, symbolism, and individuality.",
    image: "/values/identity.jpeg",
  },
  {
    id: "excellence",
    title: "EXCELLENCE",
    body: "No compromise. No shortcuts. Only refined execution.",
    image: "/values/excellence.jpeg",
  },
];

export default function ValuesSection() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpanded = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const activeImage = expandedIndex !== null ? values[expandedIndex].image : null;

  return (
    <section className={`section section-warm ${styles.values}`} id="values">
      {activeImage && (
        <div className={styles.imageBackgroundWrapper}>
          <Image
            src={activeImage}
            alt="Values Background"
            fill
            className={styles.backgroundImage}
            priority
          />
        </div>
      )}
      <div className={`container ${styles.container}`}>
        <div className={styles.header}>
          <span className="section-label">Brand Values</span>
          <h2 className={`t-heading ${styles.heading}`}>
            What we stand for
          </h2>
        </div>

        <div className={styles.accordion}>
          {values.map((v, i) => {
            const isExpanded = expandedIndex === i;
            return (
              <div
                key={v.id}
                className={`${styles.row} ${isExpanded ? styles.expanded : ""}`}
                id={`value-${v.id}`}
                onClick={() => toggleExpanded(i)}
              >
                <span className={styles.indexBg}>0{i + 1}</span>
                <div className={styles.rowHeader}>
                  <div className={styles.titleWrapper}>
                    <h3 className={styles.rowTitle}>{v.title}</h3>
                  </div>
                  <ChevronDown className={styles.icon} strokeWidth={1.5} />
                </div>

                <div className={styles.rowContent}>
                  <div className={styles.rowBodyInner}>
                    <p className={styles.rowBody}>{v.body}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
