"use client";

import type { ReactNode } from "react";
import styles from "./ProductNameLabels.module.css";

export function productNameLabelsFor(
  product: {
    category?: string;
    isLimited?: boolean;
    isBestSeller?: boolean;
  } | null | undefined,
  options?: { isBespoke?: boolean; isOutOfStock?: boolean },
) {
  const labels: string[] = [];
  if (options?.isBespoke) labels.push("Made to order");
  else if (options?.isOutOfStock) labels.push("Out of stock");
  if (product?.category === "sample-sale") labels.push("Sale");
  if (product?.isLimited && product?.category !== "sample-sale") labels.push("Limited");
  if (product?.isBestSeller) labels.push("Best seller");
  return labels;
}

export default function ProductNameRow({
  children,
  product,
  isBespoke,
  isOutOfStock,
}: {
  children: ReactNode;
  product?: {
    category?: string;
    isLimited?: boolean;
    isBestSeller?: boolean;
  } | null;
  isBespoke?: boolean;
  isOutOfStock?: boolean;
}) {
  const labels = productNameLabelsFor(product, { isBespoke, isOutOfStock });
  return (
    <div className={styles.row}>
      {children}
      {labels.map((label) => (
        <span key={label} className={styles.label}>
          {label}
        </span>
      ))}
    </div>
  );
}
