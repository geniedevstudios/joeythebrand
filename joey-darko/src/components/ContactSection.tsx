"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./ContactSection.module.css";

const SUBJECT_OPTIONS = [
  { value: "", label: "Subject" },
  { value: "Personal Styling", label: "Personal Styling" },
  { value: "Brand Strategy", label: "Brand Strategy" },
  { value: "Design Consultation", label: "Design Consultation" },
  { value: "Production Management", label: "Production Management" },
  { value: "Business Coaching", label: "Business Coaching" },
  { value: "Trend & Market Analysis", label: "Trend & Market Analysis" },
  { value: "General Inquiry", label: "General Inquiry" },
] as const;

const SELECTABLE = SUBJECT_OPTIONS.filter((o) => o.value !== "");

type SubjectSelectProps = {
  id: string;
  labelId: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

function SubjectSelect({ id, labelId, value, onChange, placeholder }: SubjectSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const display = SELECTABLE.find((o) => o.value === value)?.label ?? placeholder;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className={styles.selectRoot} ref={rootRef}>
      <button
        type="button"
        id={id}
        className={`${styles.selectTrigger} ${open ? styles.selectTriggerOpen : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={labelId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={value ? styles.selectValue : styles.selectValueMuted}>{display}</span>
        <span className={styles.selectChevron} aria-hidden />
      </button>
      {open ? (
        <ul id={listId} role="listbox" className={styles.selectMenu} aria-labelledby={labelId}>
          {SELECTABLE.map((o) => (
            <li
              key={o.value}
              role="option"
              aria-selected={value === o.value}
              className={value === o.value ? styles.selectOptionActive : styles.selectOption}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function ContactSection() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    website: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim()) {
      setStatus("error");
      setErrorDetail("Please choose a subject.");
      return;
    }
    setStatus("sending");
    setErrorDetail(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok) {
        setStatus("sent");
        return;
      }
      setStatus("error");
      setErrorDetail(typeof data.error === "string" ? data.error : null);
    } catch {
      setStatus("error");
      setErrorDetail(null);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.panel}>
        <div className={styles.honeypot} aria-hidden="true">
          <label htmlFor="contact-website">Website</label>
          <input
            type="text"
            id="contact-website"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
          />
        </div>

        {status === "sent" ? (
          <div className={styles.successState}>
            <h3 className={styles.successTitle}>Message received</h3>
            <p className={styles.successBody}>Thank you — we&apos;ll be in touch shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <p className={styles.meta}>
              Or write to{" "}
              <a className={styles.metaLink} href="mailto:joeythebrandonline@gmail.com">
                joeythebrandonline@gmail.com
              </a>
            </p>

            <div className={styles.gridFields}>
              <div className={styles.field}>
                <label htmlFor="contact-name" className={styles.label} id="contact-name-label">
                  Name
                </label>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  className={styles.input}
                  placeholder="Your name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  autoComplete="name"
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="contact-email" className={styles.label} id="contact-email-label">
                  Email
                </label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  className={styles.input}
                  placeholder="you@email.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                />
              </div>
              <div className={`${styles.field} ${styles.fieldPhone}`}>
                <label htmlFor="contact-phone" className={styles.label} id="contact-phone-label">
                  Phone <span className={styles.optionalHint}>(optional)</span>
                </label>
                <input
                  id="contact-phone"
                  name="phone"
                  type="tel"
                  className={styles.input}
                  placeholder="+233 …"
                  value={form.phone}
                  onChange={handleChange}
                  autoComplete="tel"
                />
              </div>

              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label} id="contact-subject-label">
                  Topic
                </label>
                <SubjectSelect
                  id="contact-subject"
                  labelId="contact-subject-label"
                  value={form.subject}
                  onChange={(subject) => {
                    setForm((p) => ({ ...p, subject }));
                    if (status === "error" && errorDetail === "Please choose a subject.") {
                      setStatus("idle");
                      setErrorDetail(null);
                    }
                  }}
                  placeholder="Choose a topic"
                />
              </div>

              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label htmlFor="contact-message" className={styles.label} id="contact-message-label">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  className={styles.textarea}
                  placeholder="Project, timeline, goals…"
                  value={form.message}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className={styles.footerRow}>
              {status === "error" ? (
                <p className={styles.errorMsg}>
                  {errorDetail ?? "Something went wrong. Try again or use the email above."}
                </p>
              ) : null}
              <button type="submit" className={styles.submit} disabled={status === "sending"}>
                {status === "sending" ? "Sending…" : "Send"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
