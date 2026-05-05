import type { Metadata } from "next";
import Link from "next/link";
import styles from "../shipping/shipping.module.css";
import PrivacyHero from "./PrivacyHero";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How JOEY THE BRAND collects, uses, and protects your personal information when you shop or contact us.",
};

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <PrivacyHero>
        <div className="container">
          <span className="section-label" style={{ color: "var(--cinereous)" }}>
            Policies
          </span>
          <h1 className={`t-display ${styles.title}`}>Privacy Policy</h1>
        </div>
      </PrivacyHero>

      <div className="container">
        <div className={styles.content}>
          <section className={styles.section}>
            <h2 className={styles.heading}>Overview</h2>
            <p>
              JOEY THE BRAND (&quot;we&quot;, &quot;us&quot;) respects your privacy. This policy describes how we
              collect, use, store, and protect personal information when you use our website, place an order, or
              contact us. By using our services, you agree to this policy.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.heading}>Information we collect</h2>
            <p>
              We may collect information you provide directly, including your name, email address, phone number,
              shipping and billing addresses, order details, and messages you send through forms or email.
            </p>
            <p>
              We also receive technical data automatically when you visit our site, such as device type, browser,
              approximate region (from IP), and pages viewed—used to operate and improve the experience.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.heading}>How we use your information</h2>
            <p>
              We use your information to process and deliver orders, communicate about purchases, respond to
              inquiries, send service-related messages, and comply with legal obligations. With your consent where
              required, we may send marketing updates; you can opt out at any time.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.heading}>Cookies & analytics</h2>
            <p>
              Our site may use cookies or similar technologies to remember preferences, keep sessions secure, and
              understand how visitors use the site. You can control cookies through your browser settings.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.heading}>Sharing & retention</h2>
            <p>
              We do not sell your personal data. We may share information with trusted service providers (for example
              payment processing, shipping, or email delivery) only as needed to operate our business, and under
              agreements that require them to protect your data.
            </p>
            <p>
              We retain information only as long as necessary for the purposes above, including legal, tax, and
              accounting requirements.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.heading}>Security</h2>
            <p>
              We take reasonable technical and organisational measures to protect your information. No method of
              transmission over the internet is completely secure; we encourage you to use strong passwords and
              protect your account credentials.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.heading}>Your rights</h2>
            <p>
              Depending on applicable law, you may have the right to access, correct, delete, or restrict processing
              of your personal data, or to object to certain processing. To exercise these rights, contact us using the
              details below.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.heading}>Updates</h2>
            <p>
              We may update this policy from time to time. The revised version will be posted on this page with an
              updated effective date where appropriate.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.heading}>Contact</h2>
            <p>
              For privacy-related questions, please{" "}
              <Link href="/contact?subject=general" className={styles.inlineLink}>
                contact us
              </Link>{" "}
              or email{" "}
              <a href="mailto:joeythebrandonline@gmail.com" className={styles.inlineLink}>
                joeythebrandonline@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
