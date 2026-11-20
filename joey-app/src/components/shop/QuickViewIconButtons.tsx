"use client";
import { Heart, Share2 } from "lucide-react";
import { shareProduct } from "@/lib/shareProduct";
import styles from "./QuickViewIconButtons.module.css";

/** Wishlist and Share, as round icon buttons beside Add To Cart in every quick view. */
export default function QuickViewIconButtons({
  item,
  saved,
  onToggleWishlist,
}: {
  item: { id: string; slug?: string; name: string };
  saved: boolean;
  onToggleWishlist: () => void;
}) {
  return (
    <>
      <button
        type="button"
        className={`${styles.iconBtn} ${saved ? styles.saved : ""}`}
        onClick={onToggleWishlist}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${item.name} from wishlist` : `Add ${item.name} to wishlist`}
        title={saved ? "Saved to wishlist" : "Add to wishlist"}
      >
        <Heart size={18} strokeWidth={1.5} fill={saved ? "currentColor" : "none"} aria-hidden suppressHydrationWarning />
      </button>
      <button
        type="button"
        className={styles.iconBtn}
        onClick={() => void shareProduct(item)}
        aria-label={`Share ${item.name}`}
        title="Share"
      >
        <Share2 size={18} strokeWidth={1.5} aria-hidden />
      </button>
    </>
  );
}
