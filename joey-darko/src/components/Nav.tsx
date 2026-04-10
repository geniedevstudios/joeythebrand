"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Nav.module.css";

const navLinks = [
  { label: "About", href: "/#about" },
  { label: "Services", href: "/#services" },
  { label: "Contact", href: "/#contact" },
] as const;

export default function Nav() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const solidNav = !isHome || scrolled;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <header className={`${styles.nav} ${solidNav ? styles.scrolled : ""}`}>
        <div className={styles.inner}>
          <Link href="/" className={styles.logo} aria-label="Home">
            URTAILORSTAILOR
          </Link>

          <button
            type="button"
            className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ""}`}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <span />
            <span />
            <span />
          </button>

          <nav className={styles.desktopLinks} aria-label="Primary navigation">
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href} className={styles.navLink}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <div
        className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <div className={styles.mobileMenuHeader}>
          <Link href="/" className={styles.mobileMenuLogo} onClick={() => setMenuOpen(false)}>
            URTAILORSTAILOR
          </Link>
        </div>
        <div className={styles.mobileMenuInner}>
          <p className={styles.mobileMenuLabel}>Menu</p>
          <nav className={styles.mobileNav}>
            {navLinks.map((l, i) => (
              <Link
                key={l.href}
                href={l.href}
                className={styles.mobileNavLink}
                onClick={() => setMenuOpen(false)}
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                {l.label}
              </Link>
            ))}
            <button type="button" className={styles.closeBtn} onClick={() => setMenuOpen(false)}>
              Close
            </button>
          </nav>
        </div>
      </div>
    </>
  );
}
