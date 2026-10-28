import Image from "next/image";
import Link from "next/link";
import AffiliatesSection from "@/components/AffiliatesSection";
import BookingLaunchButton from "@/components/BookingLaunchButton";
import ContactSection from "@/components/ContactSection";
import ServicesCards from "@/components/ServicesCards";
import TypedIntro from "@/components/TypedIntro";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <Image
          src="/joey-darko-hero.png"
          alt=""
          fill
          priority
          sizes="(max-width: 640px) 0px, 100vw"
          className={`${styles.heroBg} ${styles.desktopOnly}`}
        />
        <Image
          src="/joey-darko-hero-mobile.png"
          alt=""
          fill
          priority
          sizes="(max-width: 640px) 100vw, 0px"
          className={`${styles.heroBg} ${styles.mobileOnly}`}
        />
        <div className={styles.heroJoeyWrap} aria-hidden>
          <Image
            src="/firstimage.png"
            alt=""
            fill
            sizes="(max-width: 640px) 85vw, 420px"
            className={styles.heroJoeyImg}
          />
        </div>
        <div className={styles.heroOverlay} aria-hidden />
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>URTAILORSTAILOR</h1>
          <p className={styles.heroLead}>
            Looking for bespoke consultations for fashion brands and creatives &mdash; strategy, design and production guidance
            tailored for impact?
          </p>
          <BookingLaunchButton className={styles.heroCta}>Book a consultation</BookingLaunchButton>
        </div>
      </section>

      <section id="about" className={styles.introSection} aria-labelledby="about-heading">
        <div className="container">
          <header className={styles.introHeader}>
            <span className="section-label">About</span>
            <h2 id="about-heading" className={`t-section-heading ${styles.aboutTitle}`}>
              Get to know Joey
            </h2>
          </header>
          <div className={styles.introInner}>
            <div className={styles.introMediaCol}>
              <Image
                src="/joey-about-new.png"
                alt="Joey"
                width={565}
                height={862}
                sizes="(max-width: 640px) 100vw, 48vw"
                className={styles.introPhoto}
              />
              <div className={styles.introMediaWash} aria-hidden />
            </div>
            <div className={styles.introCopy}>
              <TypedIntro />
            </div>
          </div>
        </div>
      </section>

      <section id="services" className={styles.surfaceSection} aria-labelledby="services-heading">
        <div className="container">
          <span className="section-label">Services</span>
          <h2 id="services-heading" className={`t-section-heading ${styles.sectionBlockTitle}`}>
            How we can work together
          </h2>
          <p className={styles.sectionLead}>
            Strategy sessions, creative direction, and production support for fashion brands and independent designers &mdash; tailored
            to where you are in your journey.
          </p>
          <ServicesCards />
        </div>
      </section>

      <AffiliatesSection />

      <section id="contact" className={styles.contactSection} aria-labelledby="contact-heading">
        <div className="container">
          <span className="section-label">Contact</span>
          <h2 id="contact-heading" className={`t-section-heading ${styles.sectionBlockTitle}`}>
            Let&apos;s start a conversation
          </h2>
          <p className={`${styles.sectionLead} ${styles.contactLead}`}>
            Share your project and timeline — I&apos;ll follow up with next steps.
          </p>
          <ContactSection />
        </div>
      </section>
    </div>
  );
}
