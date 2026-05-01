import Link from "next/link";
import Image from "next/image";
import FooterNewsletter from "./FooterNewsletter";
import styles from "./Footer.module.css";
import { formatPhoneDisplay } from "@/lib/formatPhoneDisplay";
import CuratedPill from "./CuratedPill";

const footerLinks = [
  { label: "Collections", href: "/collection" },
  { label: "Shop", href: "/shop" },
  { label: "Story", href: "/story" },
  { label: "Events", href: "/events" },
  { label: "Bespoke", href: "/bespoke" },
  { label: "Contact", href: "/contact" },
  { label: "Shipping Policy", href: "/shipping" },
  { label: "Privacy Policy", href: "/privacy" },
];

export default function Footer() {
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

          <nav className={styles.links} aria-label="Footer navigation">
            {footerLinks.map((l) => (
              <Link key={l.href} href={l.href} className={styles.link}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className={styles.contact}>
            <p className={styles.contactLabel}>Get In Touch</p>
            <a href="mailto:joeythebrandonline@gmail.com" className={styles.contactItem}>
              joeythebrandonline@gmail.com
            </a>
            <a href="tel:+233504148009" className={styles.contactItem}>
              {formatPhoneDisplay("+233 0504 148 009")}
            </a>
            <p className={styles.contactItem}>Accra, Ghana</p>
            {/* WhatsApp */}
            <a
              href="https://wa.me/233504148009"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.whatsapp}
              id="footer-whatsapp"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp Us
            </a>

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
          <p className={styles.copy}>
            © {new Date().getFullYear()} JOEY THE BRAND. All rights reserved.
          </p>
          <p className={styles.copy}>Power worn well.</p>
          <CuratedPill devHref={devHref} />
        </div>
      </div>
    </footer>
  );
}
