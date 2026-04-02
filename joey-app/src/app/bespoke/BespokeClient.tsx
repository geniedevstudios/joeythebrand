"use client";
import { useState } from "react";
import styles from "./BespokeClient.module.css";
import CustomSelect from "@/components/CustomSelect";
import CustomDatePicker from "@/components/CustomDatePicker";

const services = ["Bespoke Tailoring", "Styling Consultation", "Wardrobe Curation", "Event Dressing"];
const serviceOptions = services.map(s => ({ value: s, label: s }));

export default function BespokeClient() {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", service: "", date: "", notes: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("https://formsubmit.co/ajax/joeythebrandonline@gmail.com", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          ...form,
          _subject: `[JOEY THE BRAND] Bespoke Booking — ${form.service}`,
        }),
      });
      if (res.ok) setStatus("sent");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className={styles.page}>
      {/* Hero header */}
      <div className={styles.header}>
        <div className="container">
          <div className={styles.headerInner}>
            <div className={styles.headerText}>
              <span className="section-label" style={{ color: "var(--cinereous)" }}>Consultancy</span>
              <h1 className={`t-display ${styles.title}`}>
                Book A Slot —<br /><em>Bespoke or Styling</em>
              </h1>
              <p className={styles.subtitle}>
                This is for clan members who desire exclusivity — our take on putting that look
                together for the big day or your next phase. We offer custom tailoring experiences
                crafted around your presence and personality.
              </p>
              <p className={styles.note}>By appointment only. Payment signals attached.</p>
            </div>

            {/* Process steps */}
            <div className={styles.steps}>
              {[
                { num: "01", label: "Book", desc: "Submit your slot request below" },
                { num: "02", label: "Consult", desc: "We discuss your vision & measurements" },
                { num: "03", label: "Create", desc: "We craft your piece" },
                { num: "04", label: "Fit", desc: "Final fitting & refinements" },
              ].map((s) => (
                <div key={s.num} className={styles.step}>
                  <span className={styles.stepNum}>{s.num}</span>
                  <div>
                    <p className={styles.stepLabel}>{s.label}</p>
                    <p className={styles.stepDesc}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Booking form */}
      <div className={`section ${styles.formSection}`}>
        <div className="container">
          <div className={styles.formWrap}>
            {status === "sent" ? (
              <div className={styles.success}>
                <div className={styles.successIcon}>✦</div>
                <h2 className={styles.successTitle}>Your slot request is in.</h2>
                <p className={styles.successBody}>
                  We&apos;ll reach out within 24–48 hours to confirm your appointment.
                  For urgent matters, WhatsApp us directly.
                </p>
                <a
                  href="https://wa.me/233504148009"
                  className="btn btn-primary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp Joey
                </a>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className={styles.form} noValidate>
                <h2 className={styles.formTitle}>Your Details</h2>

                <div className={styles.formRow}>
                  <div className="form-group">
                    <label htmlFor="name" className="form-label">Full Name *</label>
                    <input id="name" name="name" type="text" className="form-input"
                      placeholder="Your full name" value={form.name} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email" className="form-label">Email *</label>
                    <input id="email" name="email" type="email" className="form-input"
                      placeholder="your@email.com" value={form.email} onChange={handleChange} required />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className="form-group">
                    <label htmlFor="phone" className="form-label">Phone / WhatsApp *</label>
                    <input id="phone" name="phone" type="tel" className="form-input"
                      placeholder="+233 xxx xxx xxx" value={form.phone} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="date" className="form-label">Preferred Date</label>
                    <CustomDatePicker
                      id="date"
                      name="date"
                      value={form.date}
                      onChange={handleChange as any}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" id="service-label">Service Type *</label>
                  <CustomSelect
                    id="service"
                    name="service"
                    value={form.service}
                    onChange={handleChange}
                    options={serviceOptions}
                    placeholder="Select a service"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="notes" className="form-label">Tell Us About Your Vision</label>
                  <textarea id="notes" name="notes" className="form-textarea"
                    placeholder="Describe the occasion, your style preferences, or anything else we should know…"
                    value={form.notes} onChange={handleChange} />
                </div>

                {status === "error" && (
                  <p className={styles.errorMsg}>
                    Something went wrong. Please WhatsApp us directly at +233 504 148 009.
                  </p>
                )}

                <div className={styles.submitRow}>
                  <button type="submit" className="btn btn-primary btn-lg" id="bespoke-submit"
                    disabled={status === "sending"}>
                    {status === "sending" ? "Submitting…" : "Request My Slot"}
                  </button>
                  <a href="https://wa.me/233504148009" target="_blank" rel="noopener noreferrer"
                    className="btn btn-outline btn-lg" id="bespoke-wa">
                    Or WhatsApp Us
                  </a>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
