"use client";
import Link from "next/link";
import Image from "next/image";
import FooterNewsletter from "./FooterNewsletter";
import styles from "./Footer.module.css";
import { formatPhoneDisplay } from "@/lib/formatPhoneDisplay";
import CuratedPill from "./CuratedPill";
import { useState } from "react";
import CopyrightModal from "./CopyrightModal";

const companyLinks = [
  { label: "Collections", href: "/collection" },
  { label: "Shop", href: "/shop" },
  { label: "Story", href: "/story" },
  { label: "Events", href: "/events" },
  { label: "Bespoke", href: "/bespoke" },
  { label: "Contact", href: "/contact" },
  { label: "News & Blog", href: "/news" },
  { label: "Report an Issue", href: "/report-issue" },
];

const legalLinks = [
  { label: "Shipping Policy", href: "/shipping" },
  { label: "Privacy Policy", href: "/privacy" },
];

export default function Footer() {
  const [copyOpen, setCopyOpen] = useState(false);
  const devHref = (process.env.NEXT_PUBLIC_DEV_PORTFOLIO_URL || "").trim() || null;
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        {/* Top — brand + tagline + compact newsletter */}
        <div className={styles.top}>
          <div className={styles.brand}>
            <Link href="/" className={styles.logoLink} aria-label="JOEY homepage">
              <Image
                src="/white%20logo.png"
                alt="JOEY THE BRAND"
                width={750}
                height={150}
                className={styles.logoImg}
                sizes="750px"
              />
            </Link>
            <p className={styles.tagline}>Power. Precision. Presence.</p>
            <FooterNewsletter />
          </div>

          <div className={styles.linksWrapper}>
            <div className={styles.linksBlock}>
              <p className={styles.linksLabel}>Company</p>
              <nav className={styles.links} aria-label="Company navigation">
                {companyLinks.map((l) => (
                  <Link key={l.href} href={l.href} className={styles.link}>
                    {l.label}
                  </Link>
                ))}
              </nav>
            </div>
            
            <div className={styles.linksBlock}>
              <p className={styles.linksLabel}>Legal</p>
              <nav className={styles.links} aria-label="Legal navigation">
                {legalLinks.map((l) => (
                  <Link key={l.href} href={l.href} className={styles.link}>
                    {l.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          <div className={styles.contact}>
            <p className={styles.contactLabel}>Get In Touch</p>
            <a href="mailto:joeythebrandonline@gmail.com" className={styles.contactItem}>
              joeythebrandonline@gmail.com
            </a>
            <a href="tel:+233504148009" className={styles.contactItem}>
              {formatPhoneDisplay("+233 0504 148 009")}
            </a>
            <p className={styles.contactItem}>Accra, Ghana</p>


            <div className={styles.socials}>
              <span className={styles.socialLabel}>Follow us</span>
              <div className={styles.socialIcons}>
                <a 
                  href="https://www.instagram.com/joey_thebrand/#" 
                  className={styles.socialIconLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                </a>
                <span
                  className={`${styles.socialIconLink} ${styles.socialIconInactive}`}
                  aria-label="Facebook — coming soon"
                  title="Coming soon"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden={true}>
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                  </svg>
                </span>
                <span
                  className={`${styles.socialIconLink} ${styles.socialIconInactive}`}
                  aria-label="X — coming soon"
                  title="Coming soon"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden={true}>
                    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.divider} />

        {/* Bottom — copyright */}
        <div className={styles.bottom}>
          <button 
            type="button" 
            className={styles.copyBtn} 
            onClick={() => setCopyOpen(true)}
          >
            © {new Date().getFullYear()} JOEY THE BRAND. All rights reserved.
          </button>
          <p className={styles.copy}>Power worn well.</p>
          <CuratedPill devHref="https://geniedevstudios.com/services" />
        </div>
      </div>
      <CopyrightModal open={copyOpen} onClose={() => setCopyOpen(false)} />
    </footer>
  );
}
