"use client";
import styles from "./ReportIssue.module.css";
import Link from "next/link";
import PageHeroShellImageLoader from "@/components/page-hero/PageHeroShellImageLoader";
import { PAGE_HERO_SHELL_CLASS, usePageHeroShellRenderPropsWithSSRSeed } from "@/hooks/usePageHero";
import type { SiteContent } from "@/lib/types";

export default function ReportIssueClient({ initialSiteContent }: { initialSiteContent: SiteContent }) {
  const {
    empty: heroEmpty,
    shellSpinner: heroSpinner,
    style: heroStyle,
    showImageLoader: heroImageLoader,
    imageReady: heroImageReady,
  } = usePageHeroShellRenderPropsWithSSRSeed("report_issue", initialSiteContent);

  return (
    <div className={styles.page}>
      <header 
        className={`${PAGE_HERO_SHELL_CLASS} ${styles.header}`}
        data-page-hero-empty={heroEmpty ? "true" : "false"}
        data-page-hero-loading={heroSpinner ? "true" : "false"}
        data-page-hero-ready={heroImageReady ? "true" : "false"}
        style={heroStyle}
      >
        {heroImageLoader ? <PageHeroShellImageLoader /> : null}
        <div className="container">
          <span className="section-label" style={{ color: "var(--cinereous)" }}>Support</span>
          <h1 className={`t-display ${styles.title}`}>Report an Issue</h1>
          <p className={styles.lead}>
            Encountered a bug or having trouble with your order? Our team is here to help you resolve it as quickly as possible.
          </p>
        </div>
      </header>

      <section className={styles.body}>
        <div className="container">
          <div className={styles.intro}>
            <h2 className={styles.introTitle}>Before you reach out</h2>
            <p className={styles.introText}>
              You might find an immediate answer in our official documents:
            </p>
            <ul className={styles.policyList}>
              <li>
                Have a question about your order, delivery times, or returns? Check our <Link href="/shipping" className={styles.policyLink}>Shipping & Returns Policy</Link>.
              </li>
              <li>
                Concerned about your account, data, or payment security? Review our <Link href="/privacy" className={styles.policyLink}>Privacy Policy</Link>.
              </li>
            </ul>
            <p className={styles.introText}>
              If your issue persists or you have encountered a technical bug, please use one of the channels below.
            </p>
          </div>

          <div className={styles.grid}>
            {/* WhatsApp Card */}
            <a 
              href="https://wa.me/233504148009" 
              target="_blank" 
              rel="noopener noreferrer" 
              className={styles.card}
            >
              <div className={styles.cardIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <h2 className={styles.cardTitle}>WhatsApp Support</h2>
              <p className={styles.cardText}>
                For the fastest response, send us a message on WhatsApp. We typically respond within an hour.
              </p>
              <div className={styles.cardAction}>
                Start Conversation <span>→</span>
              </div>
            </a>

            {/* Email Card */}
            <a 
              href="mailto:joeythebrandonline@gmail.com" 
              className={`${styles.card} ${styles.emailCard}`}
            >
              <div className={styles.cardIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </div>
              <h2 className={styles.cardTitle}>Email Us</h2>
              <p className={styles.cardText}>
                Prefer email? Send us a detailed report including any screenshots or order numbers.
              </p>
              <div className={styles.cardAction}>
                Send Email <span>→</span>
              </div>
            </a>
          </div>

          <div style={{ marginTop: "var(--space-2xl)", textAlign: "center" }}>
            <p style={{ color: "var(--alaska-gray)", fontSize: "0.9rem" }}>
              Back to the <Link href="/contact" style={{ color: "var(--blue-athracite)", textDecoration: "underline" }}>Contact Page</Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
