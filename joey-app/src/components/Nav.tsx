"use client";
import { useState, useEffect, useSyncExternalStore, useRef } from "react";
import Link from "next/link";
import { toggleCart } from "./CartDrawer";
import { cartStore } from "@/store/cartStore";
import { authStore } from "@/store/authStore";
import { wishlistStore } from "@/store/wishlistStore";
import styles from "./Nav.module.css";

const EMPTY_ARRAY: any[] = [];

const navLinks = [
  { label: "Shop", href: "/shop" },
  { label: "Story", href: "/story" },
  { label: "Bespoke", href: "/bespoke" },
  { label: "Contact", href: "/contact" },
];

const ICONS = ["cart", "wishlist", "profile"] as const;
type IconType = typeof ICONS[number];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeIcon, setActiveIcon] = useState<IconType>("cart");
  const [iconVisible, setIconVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const items = useSyncExternalStore(cartStore.subscribe, cartStore.getCart, () => EMPTY_ARRAY);
  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
  const wishlistItems = useSyncExternalStore(wishlistStore.subscribe, wishlistStore.getItems, () => EMPTY_ARRAY);
  const wishlistCount = wishlistItems.length;
  const user = useSyncExternalStore(authStore.subscribe, authStore.getUser, () => null);
  const initials = user ? authStore.getInitials() : "";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  // Rotate icons every 7 seconds
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setIconVisible(false);
      setTimeout(() => {
        setActiveIcon((prev) => {
          const idx = ICONS.indexOf(prev);
          return ICONS[(idx + 1) % ICONS.length];
        });
        setIconVisible(true);
      }, 300);
    }, 7000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleIconClick = () => {
    // Reset timer on manual click
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIconVisible(false);
      setTimeout(() => {
        setActiveIcon((prev) => {
          const idx = ICONS.indexOf(prev);
          return ICONS[(idx + 1) % ICONS.length];
        });
        setIconVisible(true);
      }, 300);
    }, 7000);
  };

  const renderIcon = () => {
    const cls = `${styles.rotatingIcon} ${iconVisible ? styles.iconVisible : styles.iconHidden}`;

    if (activeIcon === "cart") {
      return (
        <button className={`${styles.iconBtn} ${cls}`} aria-label="Cart" onClick={() => { toggleCart(); handleIconClick(); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 01-8 0"/>
          </svg>
          {totalItems > 0 && <span className={styles.cartBadge}>{totalItems}</span>}
        </button>
      );
    }

    if (activeIcon === "wishlist") {
      return (
        <Link href="/wishlist" className={`${styles.iconBtn} ${cls}`} aria-label="Wishlist" onClick={handleIconClick}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          {wishlistCount > 0 && <span className={styles.cartBadge}>{wishlistCount}</span>}
        </Link>
      );
    }

    // profile
    if (user) {
      return (
        <Link href="/account" className={`${styles.iconBtn} ${cls} ${styles.avatarBtn}`} aria-label="Account" onClick={handleIconClick}>
          <span className={styles.avatar}>{initials}</span>
        </Link>
      );
    }

    return (
      <Link href="/account" className={`${styles.iconBtn} ${cls}`} aria-label="Sign In" onClick={handleIconClick}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </Link>
    );
  };

  return (
    <>
      <header className={`${styles.nav} ${scrolled ? styles.scrolled : ""}`}>
        <div className={styles.inner}>
          <button
            className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ""}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            id="hamburger-btn"
          >
            <span />
            <span />
            <span />
          </button>

          <nav className={styles.leftLinks} aria-label="Primary navigation">
            {navLinks.slice(0, 2).map((l) => (
              <Link key={l.href} href={l.href} className={styles.navLink}>
                {l.label}
              </Link>
            ))}
          </nav>

          <Link href="/" className={styles.logo} aria-label="JOEY homepage">
            JOEY
          </Link>

          <nav className={styles.rightLinks} aria-label="Secondary navigation">
            {navLinks.slice(2).map((l) => (
              <Link key={l.href} href={l.href} className={styles.navLink}>
                {l.label}
              </Link>
            ))}
            <div className={styles.iconSlot}>
              <div className={styles.iconWrapper}>
                {renderIcon()}
              </div>
              <div className={styles.iconDropdown}>
                <button className={styles.dropdownItem} onClick={() => { toggleCart(); handleIconClick(); }} aria-label="Cart">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <path d="M16 10a4 4 0 01-8 0"/>
                  </svg>
                  <span>Cart {totalItems > 0 && `(${totalItems})`}</span>
                </button>
                <Link href="/wishlist" className={styles.dropdownItem} onClick={handleIconClick}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={wishlistCount > 0 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  <span>Wishlist {wishlistCount > 0 && `(${wishlistCount})`}</span>
                </Link>
                <Link href="/account" className={styles.dropdownItem} onClick={handleIconClick}>
                  {user ? (
                    <>
                      <span className={styles.dropdownAvatar}>{initials}</span>
                      <span>{user.name}</span>
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      <span>Sign In</span>
                    </>
                  )}
                </Link>
              </div>
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile fullscreen menu */}
      <div className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ""}`} role="dialog" aria-modal="true">
        <div className={styles.mobileMenuHeader}>
          <Link href="/" className={styles.mobileMenuLogo} onClick={() => setMenuOpen(false)}>
            JOEY
          </Link>
        </div>
        <div className={styles.mobileMenuInner}>
          <p className={styles.mobileMenuLabel}>Menu</p>
          <nav className={styles.mobileNav}>
            {navLinks.slice(0, 2).map((l, i) => (
              <Link key={l.href} href={l.href} className={styles.mobileNavLink}
                onClick={() => setMenuOpen(false)} style={{ animationDelay: `${i * 0.08}s` }}>
                {l.label}
              </Link>
            ))}
            <Link href="/" className={styles.mobileNavLink}
              onClick={() => setMenuOpen(false)} style={{ animationDelay: "0.16s" }}>
              Home
            </Link>
            {navLinks.slice(2).map((l, i) => (
              <Link key={l.href} href={l.href} className={styles.mobileNavLink}
                onClick={() => setMenuOpen(false)} style={{ animationDelay: `${(i + 3) * 0.08}s` }}>
                {l.label}
              </Link>
            ))}
            <button className={styles.closeBtn} onClick={() => setMenuOpen(false)}
              style={{ animationDelay: "0.45s" }}>
              Close
            </button>
          </nav>
          <p className={styles.mobileMenuTagline}>Power. Precision. Presence.</p>
        </div>
      </div>
    </>
  );
}
