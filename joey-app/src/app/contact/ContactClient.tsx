"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "./ContactClient.module.css";
import PageHeroShellImageLoader from "@/components/page-hero/PageHeroShellImageLoader";
import { PAGE_HERO_SHELL_CLASS, usePageHeroShellRenderPropsWithSSRSeed } from "@/hooks/usePageHero";
import type { SiteContent } from "@/lib/types";
import CustomSelect from "@/components/CustomSelect";
import { authStore } from "@/store/authStore";
import { formatPhoneDisplay } from "@/lib/formatPhoneDisplay";

type ContactFormState = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  website: string;
};

const CONTACT_FORM_EMPTY: ContactFormState = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
  website: "",
};

const SUBJECT_OPTIONS = [
  { value: "Custom Order", label: "Custom Order" },
  { value: "Bespoke Inquiry", label: "Bespoke Inquiry" },
  { value: "Press Inquiry", label: "Press Inquiry" },
  { value: "Collaboration", label: "Collaboration" },
  { value: "General Inquiry", label: "General Inquiry" },
];

export default function ContactClient({ initialSiteContent }: { initialSiteContent: SiteContent }) {
  const searchParams = useSearchParams();
  const user = useSyncExternalStore(authStore.subscribe, authStore.getUser, () => null);
  const [form, setForm] = useState<ContactFormState>(CONTACT_FORM_EMPTY);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const {
    empty: contactHeroEmpty,
    shellSpinner: contactHeroSpinner,
    style: contactHeroStyle,
    showImageLoader: contactHeroImageLoader,
  } = usePageHeroShellRenderPropsWithSSRSeed("contact", initialSiteContent);

  /** URL: ?subject=General%20Inquiry or ?subject=general */
  useEffect(() => {
    const raw = searchParams.get("subject")?.trim();
    if (!raw) return;
    const aliases: Record<string, string> = {
      general: "General Inquiry",
      "general-inquiry": "General Inquiry",
      general_inquiry: "General Inquiry",
    };
    queueMicrotask(() => {
      const fromAlias = aliases[raw.toLowerCase()];
      if (fromAlias) {
        setForm((prev) => ({ ...prev, subject: fromAlias }));
        return;
      }
      let decoded = raw;
      try {
        decoded = decodeURIComponent(raw);
      } catch {
        decoded = raw;
      }
      const match = SUBJECT_OPTIONS.find((o) => o.value.toLowerCase() === decoded.toLowerCase());
      if (match) {
        setForm((prev) => ({ ...prev, subject: match.value }));
      }
    });
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    queueMicrotask(() => {
      setForm((prev) => ({
        ...prev,
        email: prev.email.trim() ? prev.email : user.email,
        name: prev.name.trim() ? prev.name : user.name,
      }));
    });
  }, [user]);

  useEffect(() => {
    if (status !== "sent") return;
    const t = window.setTimeout(() => {
      setStatus("idle");
      setForm((prev) => ({
        ...CONTACT_FORM_EMPTY,
        email: prev.email.trim() ? prev.email : "",
        name: prev.name.trim() ? prev.name : "",
      }));
    }, 4500);
    return () => window.clearTimeout(t);
  }, [status]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) setStatus("sent");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className={styles.page}>
      <div
        className={`${PAGE_HERO_SHELL_CLASS} ${styles.header}`}
        data-page-hero-empty={contactHeroEmpty ? "true" : "false"}
        data-page-hero-loading={contactHeroSpinner ? "true" : "false"}
        style={contactHeroStyle}
      >
        {contactHeroImageLoader ? <PageHeroShellImageLoader /> : null}
        <div className="container">
          <span className="section-label" style={{ color: "var(--cinereous)" }}>Contact</span>
          <h1 className={`t-display ${styles.title}`}>
            Let&apos;s Build Something Powerful
          </h1>
          <p className={styles.subtitle}>
            For custom orders, press inquiries, collaborations, or consulting, reach out…
          </p>
        </div>
      </div>

      <div className={`section ${styles.body}`}>
        <div className="container">
          <div className={styles.grid}>
            <div className={styles.infoCol}>
              <div className={styles.infoGroup}>
                <h2 className={styles.infoHeading}>Get In Touch</h2>

                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Email</span>
                  <a href="mailto:joeythebrandonline@gmail.com" className={styles.infoValue}>
                    joeythebrandonline@gmail.com
                  </a>
                </div>

                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Phone</span>
                  <a href="tel:+233504148009" className={styles.infoValue}>
                    {formatPhoneDisplay("+233 (0) 504 148 009")}
                  </a>
                </div>

                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Location</span>
                  <span className={styles.infoValue}>Accra, Ghana</span>
                </div>

                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Appointments</span>
                  <Link href="/bespoke" className={styles.infoValue}>
                    By bookings only
                  </Link>
                </div>
              </div>

              <div className={styles.divider} />

              <div className={styles.issueLinkWrap}>
                <p className={styles.issueText}>
                  Having trouble with the form? <Link href="/report-issue" className={styles.issueLink}>Report an issue</Link>
                </p>
              </div>

              <blockquote className={styles.quote}>
                &ldquo;Power worn well.&rdquo;
              </blockquote>
            </div>

            <div className={styles.formCol}>
              {status === "sent" ? (
                <div className={styles.successState}>
                  <div className={styles.successIcon}>✦</div>
                  <h3 className={styles.successTitle}>Message received.</h3>
                  <p className={styles.successBody}>
                    Thank you for reaching out. We&apos;ll be in touch shortly.
                  </p>
                  <button
                    type="button"
                    className={styles.sendAnother}
                    onClick={() => {
                      setStatus("idle");
                      setForm({ ...CONTACT_FORM_EMPTY });
                    }}
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className={styles.form} noValidate>
                  <h2 className={styles.formHeading}>Send a Message</h2>

                  {/* Honeypot: leave empty; bots often autofill */}
                  <div className={styles.honeypot} aria-hidden="true">
                    <label htmlFor="contact-website">Website</label>
                    <input
                      type="text"
                      id="contact-website"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={form.website}
                      onChange={handleChange}
                    />
                  </div>

                  <div className={styles.formRow}>
                    <div className="form-group">
                      <label htmlFor="name" className="form-label">Full Name</label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        className="form-input"
                        placeholder="Your name"
                        value={form.name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="email" className="form-label">Email</label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        className="form-input"
                        placeholder="your@email.com"
                        value={form.email}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone" className="form-label">Phone</label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      className="form-input"
                      placeholder="+233 … or local number"
                      value={form.phone}
                      onChange={handleChange}
                      autoComplete="tel"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" id="subject-label">Subject</label>
                    <CustomSelect
                      id="subject"
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      options={SUBJECT_OPTIONS}
                      placeholder="Select a subject"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="message" className="form-label">Message</label>
                    <textarea
                      id="message"
                      name="message"
                      className="form-textarea"
                      placeholder="Tell us what you have in mind…"
                      value={form.message}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  {status === "error" && (
                    <p className={styles.errorMsg}>Something went wrong. Please try again or email us directly.</p>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    id="contact-submit"
                    disabled={status === "sending"}
                  >
                    {status === "sending" ? "Sending…" : "Send Message"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
