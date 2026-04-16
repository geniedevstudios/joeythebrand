"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "./ContactClient.module.css";
import { usePageHeroBackgroundStyle } from "@/hooks/usePageHero";
import CustomSelect from "@/components/CustomSelect";
import { authStore } from "@/store/authStore";

export default function ContactClient() {
  const searchParams = useSearchParams();
  const user = useSyncExternalStore(authStore.subscribe, authStore.getUser, () => null);
  const emptyForm = { name: "", email: "", phone: "", subject: "", message: "", website: "" };
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const contactHeroStyle = usePageHeroBackgroundStyle("contact");

  const subjectOptions = [
    { value: "Custom Order", label: "Custom Order" },
    { value: "Bespoke Inquiry", label: "Bespoke Inquiry" },
    { value: "Press Inquiry", label: "Press Inquiry" },
    { value: "Collaboration", label: "Collaboration" },
    { value: "General Inquiry", label: "General Inquiry" },
  ];

  /** URL: ?subject=General%20Inquiry or ?subject=general */
  useEffect(() => {
    const raw = searchParams.get("subject")?.trim();
    if (!raw) return;
    const aliases: Record<string, string> = {
      general: "General Inquiry",
      "general-inquiry": "General Inquiry",
      general_inquiry: "General Inquiry",
    };
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
    const match = subjectOptions.find((o) => o.value.toLowerCase() === decoded.toLowerCase());
    if (match) {
      setForm((prev) => ({ ...prev, subject: match.value }));
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      email: prev.email.trim() ? prev.email : user.email,
      name: prev.name.trim() ? prev.name : user.name,
    }));
  }, [user?.id, user?.email, user?.name]);

  useEffect(() => {
    if (status !== "sent") return;
    const t = window.setTimeout(() => {
      setStatus("idle");
      setForm((prev) => ({
        ...emptyForm,
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
      <div className={styles.header} style={contactHeroStyle}>
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
                    +233 (0) 504 148 009
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

              <a
                href="https://wa.me/233504148009"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.whatsappCard}
                id="contact-whatsapp"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <div>
                  <p className={styles.waTitle}>Chat on WhatsApp</p>
                  <p className={styles.waSub}>Quick inquiries & bespoke questions</p>
                </div>
              </a>

              <blockquote className={styles.quote}>
                "Power worn well."
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
                      setForm(emptyForm);
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
                      options={subjectOptions}
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
