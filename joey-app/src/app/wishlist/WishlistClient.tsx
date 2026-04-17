"use client";
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { wishlistStore } from "@/store/wishlistStore";
import { cartStore } from "@/store/cartStore";
import styles from "./WishlistClient.module.css";
import { PAGE_HERO_SHELL_CLASS, usePageHeroBackgroundStyle, usePageHeroEmpty } from "@/hooks/usePageHero";

const EMPTY_ARRAY: any[] = [];

const tabs = [
  { id: "all", label: "All Pieces" },
  { id: "always-lit", label: "Always Lit" },
  { id: "limited-edition", label: "Limited Edition" },
  { id: "sample-sale", label: "Sample Sale" },
];

type AddStatus = "idle" | "adding" | "added";

export default function WishlistClient() {
  const items = useSyncExternalStore(wishlistStore.subscribe, wishlistStore.getItems, () => EMPTY_ARRAY);
  const [addStatus, setAddStatus] = useState<Record<string, AddStatus>>({});
  const wishlistHeroStyle = usePageHeroBackgroundStyle("wishlist");
  const wishlistHeroEmpty = usePageHeroEmpty("wishlist");

  const getCategoryLabel = (cat: string) => {
    const tab = tabs.find(t => t.id === cat);
    return tab ? tab.label : cat;
  };

  const handleRemove = (id: string, name: string) => {
    wishlistStore.removeItem(id);
    toast.success(`${name} removed from wishlist`);
  };

  const handleAddToCart = (item: typeof items[0]) => {
    const priceNum = Number(item.price.replace(/[^0-9.-]+/g, ""));
    
    setAddStatus(prev => ({ ...prev, [item.id]: "adding" }));
    
    setTimeout(() => {
      cartStore.addItem({
        productId: item.id,
        name: item.name,
        size: "Standard",
        price: priceNum,
        image: item.image,
        quantity: 1,
        maxStock: 99,
      });
      wishlistStore.removeItem(item.id);
      cartStore.toggleCart(true);
      setAddStatus(prev => ({ ...prev, [item.id]: "added" }));
      toast.success(`${item.name} added to cart`);
      setTimeout(() => {
        setAddStatus(prev => ({ ...prev, [item.id]: "idle" }));
      }, 2000);
    }, 400);
  };

  const getButtonText = (id: string) => {
    const status = addStatus[id] || "idle";
    if (status === "adding") return "Adding...";
    if (status === "added") return "Added 👍";
    return "Add to Cart";
  };

  return (
    <div className={styles.page}>
      <div
        className={`${PAGE_HERO_SHELL_CLASS} ${styles.pageHeader}`}
        data-page-hero-empty={wishlistHeroEmpty ? "true" : "false"}
        style={wishlistHeroStyle}
      >
        <div className="container">
          <span className="section-label">Saved For Later</span>
          <h1 className={`t-display ${styles.pageTitle}`}>Wishlist</h1>
        </div>
      </div>

      <div className="container">
        {items.length === 0 ? (
          <div className={styles.empty}>
            <p>No pieces saved yet.</p>
            <Link href="/shop" className="btn btn-primary" style={{ marginTop: "1.5rem" }}>
              Browse The Shop
            </Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {items.map((item) => (
              <article key={item.id} className={styles.card}>
                <div className={styles.imageWrap}>
                  {item.hoverImage ? (
                    <>
                      <img src={item.image} alt={item.name} className={styles.imagePrimary} loading="lazy" />
                      <img src={item.hoverImage} alt="" className={styles.imageHover} loading="lazy" aria-hidden />
                    </>
                  ) : (
                    <img src={item.image} alt={item.name} className={styles.image} loading="lazy" />
                  )}
                  <div className={styles.overlay}>
                    <div className={styles.actionButtons}>
                      <button 
                        className={styles.iconBtn} 
                        aria-label="Remove from Wishlist" 
                        title="Remove"
                        onClick={() => handleRemove(item.id, item.name)}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                      </button>
                    </div>
                    <div className={styles.pickMeWrap}>
                      <button
                        type="button"
                        className={styles.pickMeBtn}
                        aria-label={`Add ${item.name} to cart`}
                        onClick={() => handleAddToCart(item)}
                        disabled={addStatus[item.id] !== "idle"}
                      >
                        {getButtonText(item.id)}
                      </button>
                    </div>
                  </div>
                </div>
                <div className={styles.info}>
                  <span className={styles.category}>{item.category}</span>
                  <h2 className={styles.name}>{item.name}</h2>
                  <div className={styles.priceRow}>
                    <span className={styles.price}>{item.price}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}