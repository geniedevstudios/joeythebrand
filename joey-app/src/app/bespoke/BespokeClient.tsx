"use client";
import { useState, useEffect, useSyncExternalStore, useCallback } from "react";
import Link from "next/link";
import styles from "./BespokeClient.module.css";
import { usePageHeroBackgroundStyle } from "@/hooks/usePageHero";
import CustomSelect from "@/components/CustomSelect";
import CustomDatePicker from "@/components/CustomDatePicker";
import { authStore } from "@/store/authStore";
import { dataStore } from "@/lib/dataStore";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const services = ["Bespoke Tailoring", "Styling Consultation", "Wardrobe Curation", "Event Dressing"];
const serviceOptions = services.map((s) => ({ value: s, label: s }));

export default function BespokeClient() {
  const user = useSyncExternalStore(authStore.subscribe, authStore.getUser, () => null);
  const [bookingIdForPayment, setBookingIdForPayment] = useState<string | null>(null);
  const [payConfirmOpen, setPayConfirmOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    date: "",
    notes: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [submitError, setSubmitError] = useState("");
  const [disabledDates, setDisabledDates] = useState<string[]>([]);
  const [calendarLoadError, setCalendarLoadError] = useState("");
  const bespokeHeroStyle = usePageHeroBackgroundStyle("bespoke");

  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      name: prev.name.trim() ? prev.name : user.name || "",
      email: prev.email.trim() ? prev.email : user.email || "",
    }));
  }, [user?.id, user?.email, user?.name]);

  const loadCalendar = useCallback(async () => {
    if (!user?.id) {
      setDisabledDates([]);
      setCalendarLoadError("");
      return;
    }
    try {
      const { disabledDateSet } = await dataStore.getConsultationAvailability(user.id);
      setDisabledDates([...disabledDateSet]);
      setCalendarLoadError("");
    } catch {
      setDisabledDates([]);
      setCalendarLoadError(
        "Live calendar could not be loaded. You can still pick a date; if it’s unavailable, you’ll see an error when you submit.",
      );
    }
  }, [user?.id]);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  useEffect(() => {
    if (!user?.id) return;
    const id = window.setInterval(() => void loadCalendar(), 60000);
    return () => window.clearInterval(id);
  }, [user?.id, loadCalendar]);

  useEffect(() => {
    if (!user?.id) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel(`bespoke-calendar-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "consultation_bookings" }, () => {
        if (t) clearTimeout(t);
        t = setTimeout(() => {
          t = undefined;
          void loadCalendar();
        }, 150);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "consultation_settings" }, () => {
        if (t) clearTimeout(t);
        t = setTimeout(() => {
          t = undefined;
          void loadCalendar();
        }, 150);
      })
      .subscribe();
    return () => {
      if (t) clearTimeout(t);
      void supabase.removeChannel(channel);
    };
  }, [user?.id, loadCalendar]);

  useEffect(() => {
    const scriptId = "paystack-js";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://js.paystack.co/v1/inline.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (!payConfirmOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPayConfirmOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [payConfirmOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const DOWNPAYMENT_GHS = 1110;

  const openPayConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitError("");
    if (!form.date?.trim()) {
      setSubmitError("Please choose a preferred date.");
      return;
    }
    if (!form.service?.trim()) {
      setSubmitError("Please select a service type.");
      return;
    }
    // @ts-ignore
    if (!window.PaystackPop) {
      toast.error("Payment gateway is still loading. Please wait a moment.");
      return;
    }
    setPayConfirmOpen(true);
  };

  const proceedToPay = async () => {
    if (!user) return;
    setPayConfirmOpen(false);
    setStatus("sending");
    try {
      const booking = await dataStore.createConsultationBooking({
        userId: user.id,
        customerName: form.name,
        customerEmail: form.email,
        customerPhone: form.phone,
        service: form.service,
        preferredDate: form.date.trim(),
        notes: form.notes || undefined,
      });
      setBookingIdForPayment(booking.id);

      const amount = Math.round(DOWNPAYMENT_GHS * 100);

      // @ts-ignore
      const handler = window.PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
        email: form.email,
        amount,
        currency: "GHS",
        ref: "BSP-" + Date.now() + "-" + booking.id.slice(0, 8),
        metadata: {
          custom_fields: [
            {
              display_name: "Consultation Booking ID",
              variable_name: "booking_id",
              value: booking.id,
            },
          ],
        },
        callback: function (paystackRes: any) {
          (async () => {
            try {
              const verifyRes = await fetch("/api/paystack/verify-consultation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  reference: paystackRes.reference,
                  bookingId: booking.id,
                }),
              });
              const verifyData = await verifyRes.json();
              if (!verifyRes.ok) throw new Error(verifyData.error || "Verification failed");
              setStatus("sent");
              toast.success("Down payment received. Your slot request is in.");
              void loadCalendar();
            } catch (err) {
              setStatus("error");
              setSubmitError(err instanceof Error ? err.message : "Payment verification failed.");
              toast.error(err instanceof Error ? err.message : "Payment verification failed.");
            }
          })();
        },
        onClose: function () {
          setStatus("idle");
          toast.info("Payment cancelled.");
          if (!booking?.id) return;
          void fetch("/api/paystack/abandon-consultation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingId: booking.id }),
          });
        },
      });

      handler.openIframe();
    } catch (err) {
      setStatus("error");
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header} style={bespokeHeroStyle}>
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
              <p className={styles.note}>
                By appointment only. A down payment of <strong>GHS 1,110</strong> is required to reserve a slot.
              </p>
            </div>

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

      <div className={`section ${styles.formSection}`}>
        <div className="container">
          <div className={styles.formWrap}>
            {!user ? (
              <div className={styles.success}>
                <div className={styles.successIcon}>✦</div>
                <h2 className={styles.successTitle}>Sign in to request a slot</h2>
                <p className={styles.successBody}>
                  Bespoke appointments are tied to your account so you can track status, see when we confirm,
                  and receive your booking code after approval.
                </p>
                <Link href="/account" className="btn btn-primary">
                  Sign in or create an account
                </Link>
              </div>
            ) : status === "sent" ? (
              <div className={styles.success}>
                <div className={styles.successIcon}>✦</div>
                <h2 className={styles.successTitle}>Your slot request is in.</h2>
                <p className={styles.successBody}>
                  We&apos;ll review your details and update the status on your account within 24–48 hours.
                  You can follow progress under <strong>Bespoke appointments</strong> on your account page.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center" }}>
                  <Link href="/account" className="btn btn-primary">
                    View my account
                  </Link>
                  <a
                    href="https://wa.me/233504148009"
                    className="btn btn-outline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp Joey
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={openPayConfirm} className={styles.form} noValidate>
                <p className={styles.signedInNote}>
                  Signed in as <strong>{user.email}</strong>. This request will appear on your account.
                </p>
                <h2 className={styles.formTitle}>Your Details</h2>

                <div className={styles.formRow}>
                  <div className="form-group">
                    <label htmlFor="name" className="form-label">Full Name *</label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      className="form-input"
                      placeholder="Your full name"
                      value={form.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email" className="form-label">Email *</label>
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

                <div className={styles.formRow}>
                  <div className="form-group">
                    <label htmlFor="phone" className="form-label">Phone / WhatsApp *</label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      className="form-input"
                      placeholder="+233 xxx xxx xxx"
                      value={form.phone}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="date" className="form-label">Preferred Date *</label>
                    {calendarLoadError ? (
                      <p className={styles.calendarWarn}>{calendarLoadError}</p>
                    ) : null}
                    <CustomDatePicker
                      id="date"
                      name="date"
                      value={form.date}
                      onChange={handleChange as (e: { target: { name: string; value: string } }) => void}
                      min={new Date().toISOString().split("T")[0]}
                      disabledDates={disabledDates}
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
                  <textarea
                    id="notes"
                    name="notes"
                    className="form-textarea"
                    placeholder="Describe the occasion, your style preferences, or anything else we should know…"
                    value={form.notes}
                    onChange={handleChange}
                  />
                </div>

                {(status === "error" || submitError) && (
                  <p className={styles.errorMsg}>
                    {submitError
                      ? submitError
                      : status === "error"
                        ? "Could not save your request. Confirm the consultations SQL (including calendar) is applied in Supabase, or WhatsApp us at +233 504 148 009."
                        : null}
                  </p>
                )}

                <div className={styles.submitRow}>
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    id="bespoke-submit"
                    disabled={status === "sending"}
                  >
                    {status === "sending" ? "Submitting…" : "Request My Slot"}
                  </button>
                  <a
                    href="https://wa.me/233504148009"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-lg"
                    id="bespoke-wa"
                  >
                    Or WhatsApp Us
                  </a>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {payConfirmOpen ? (
        <div
          className={styles.payBackdrop}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm down payment"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPayConfirmOpen(false);
          }}
        >
          <div className={styles.payModal}>
            <div className={styles.payModalHeader}>
              <div className={styles.payModalKicker}>Down payment</div>
              <h3 className={styles.payModalTitle}>Proceed to pay to book your slot</h3>
            </div>
            <div className={styles.payModalBody}>
              <p className={styles.payModalMsg}>
                You will be charged <strong>GHS {DOWNPAYMENT_GHS.toLocaleString()}</strong> to reserve your slot.
                After payment, your request will appear on your account for confirmation.
              </p>
            </div>
            <div className={styles.payModalActions}>
              <button type="button" className="btn btn-outline" onClick={() => setPayConfirmOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={proceedToPay}>
                Confirm &amp; Pay
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
