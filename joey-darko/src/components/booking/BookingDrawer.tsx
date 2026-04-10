"use client";

import { useEffect, useId, useRef, useState } from "react";
import BookingDatePicker from "@/components/BookingDatePicker";
import { getPublicConsultationAvailability } from "@/lib/consultationBooking";
import { SERVICES } from "@/lib/servicesData";
import FocusServiceSelect from "./FocusServiceSelect";
import BookingStatusCard from "./BookingStatusCard";
import { getBookingTokens, saveBookingToken } from "@/lib/bookingHistory";
import styles from "./bookingDrawer.module.css";

const services = SERVICES.map(s => s.title);

const PLANS = [
  { id: "1h", title: "Intro Session", duration: "1 Hour", price: 1000 },
  { id: "3h", title: "Deep Dive", duration: "3 Hours", price: 2500 },
  { id: "8h", title: "Full Immersion", duration: "Full Day", price: 5000 },
];

type Props = {
  open: boolean;
  onClose: () => void;
  initialService?: string;
};

export default function BookingDrawer({ open, onClose, initialService }: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  
  const [tab, setTab] = useState<"request" | "bookings">("request");
  const [historyTokens, setHistoryTokens] = useState<string[]>([]);
  const [importTokenStr, setImportTokenStr] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    date: "",
    notes: "",
  });
  const [lastToken, setLastToken] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[number] | null>(null);
  const [status, setStatus] = useState<"idle" | "payment" | "sending" | "sent" | "error">("idle");
  const [submitError, setSubmitError] = useState("");
  const [disabledDates, setDisabledDates] = useState<string[]>([]);
  const [calendarLoadError, setCalendarLoadError] = useState("");
  const [serviceMenuOpen, setServiceMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const scriptId = "paystack-js";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://js.paystack.co/v1/inline.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, [open]);

  // Sync history when drawer opens or history updates
  const loadHistory = () => setHistoryTokens(getBookingTokens());

  useEffect(() => {
    if (open) {
      loadHistory();
    }
  }, [open]);

  useEffect(() => {
    window.addEventListener("joeyydarko-history-updated", loadHistory);
    return () => window.removeEventListener("joeyydarko-history-updated", loadHistory);
  }, []);

  useEffect(() => {
    if (!open) return;
    setForm({ 
      name: "", 
      email: "", 
      phone: "", 
      service: initialService || "", 
      date: "", 
      notes: "" 
    });
    setSelectedPlan(null);
    setStatus("idle");
    setSubmitError("");
    setServiceMenuOpen(false);
    setImportTokenStr("");
    setTab("request");
    closeRef.current?.focus();
  }, [open, initialService]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    
    const fetchDates = async () => {
      try {
        const { disabledDateSet } = await getPublicConsultationAvailability();
        if (!cancelled) {
          setDisabledDates([...disabledDateSet]);
          setCalendarLoadError("");
        }
      } catch {
        if (!cancelled) {
          setDisabledDates([]);
          setCalendarLoadError(
            "Calendar unavailable — you can still pick a date; we’ll confirm if there’s a conflict.",
          );
        }
      }
    };
    void fetchDates();

    const onRefresh = () => {
      void fetchDates();
    };
    window.addEventListener("joeyydarko-refresh", onRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener("joeyydarko-refresh", onRefresh);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (serviceMenuOpen) {
        setServiceMenuOpen(false);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, serviceMenuOpen]);

  useEffect(() => {
    if (status === "sent") {
      const timer = setTimeout(() => {
        setForm({ name: "", email: "", phone: "", service: "", date: "", notes: "" });
        setStatus("idle");
        setLastToken("");
        setTab("request");
        setCopied(false);
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: string } },
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleDateChange = (e: { target: { name: string; value: string } }) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (!form.service?.trim()) {
      setSubmitError("Choose a focus area.");
      return;
    }
    if (!form.date?.trim()) {
      setSubmitError("Choose a preferred date.");
      return;
    }
    if (!selectedPlan) {
      setSubmitError("Please select a consultation duration.");
      return;
    }
    
    // Move to simulated payment step
    setStatus("payment");
  };

  const handleCompletePayment = async () => {
    if (!selectedPlan) return;
    
    // @ts-ignore
    if (!window.PaystackPop) {
      setSubmitError("Payment gateway is still loading. Please wait a moment.");
      return;
    }

    setSubmitError("");
    setStatus("sending");

    try {
      // 1) Save the booking first as 'unpaid'
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.name,
          customerEmail: form.email,
          customerPhone: form.phone,
          service: form.service,
          preferredDate: form.date.trim(),
          notes: form.notes || undefined,
          durationHours: selectedPlan.id === "1h" ? 1 : selectedPlan.id === "3h" ? 3 : 8,
          priceGhs: selectedPlan.price,
        }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string; slipToken?: string; id?: string };
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      // 2) Trigger Paystack
      // @ts-ignore
      const handler = window.PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
        email: form.email,
        amount: selectedPlan.price * 100,
        currency: "GHS",
        ref: "JOEY-" + new Date().getTime(),
        metadata: {
          custom_fields: [
            {
              display_name: "Booking ID",
              variable_name: "booking_id",
              value: data.id || "",
            },
          ],
        },
        callback: function(paystackRes: any) {
          // 3) Verify on backend
          setStatus("sending");
          fetch("/api/paystack/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reference: paystackRes.reference,
              bookingId: data.id,
            }),
          })
          .then(vRes => vRes.json())
          .then(verifyData => {
             if (verifyData.error) throw new Error(verifyData.error);
             if (data.slipToken) {
               saveBookingToken(data.slipToken);
               setLastToken(data.slipToken);
             }
             setStatus("sent");
          })
          .catch(err => {
            setStatus("error");
            setSubmitError(err instanceof Error ? err.message : "Payment verification failed.");
          });
        },
        onClose: function() {
          setStatus("payment");
        },
      });

      handler.openIframe();
    } catch (err) {
      setStatus("error");
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  const handleImportToken = (e: React.FormEvent) => {
    e.preventDefault();
    const t = importTokenStr.trim();
    if (!t) return;
    
    // Extract token if they pasted a full URL
    let tokenToSave = t;
    try {
      // Trying to parse as URL
      if (t.includes("http") || t.includes("?token=")) {
        const url = new URL(t.startsWith("http") ? t : `http://localhost${t}`);
        const q = url.searchParams.get("token");
        if (q) tokenToSave = q;
      }
    } catch {
      // pass
    }

    saveBookingToken(tokenToSave);
    setImportTokenStr("");
  };

  const minDate = new Date().toISOString().split("T")[0];

  return (
    <>
      <div
        className={`${styles.backdrop} ${open ? styles.visible : ""}`}
        aria-hidden={!open}
        onClick={onClose}
      />

      <aside
        className={`${styles.panel} ${open ? styles.open : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-hidden={!open}
      >
        <div className={styles.header}>
          <div>
            <div className={styles.tabList}>
              <button
                className={`${styles.tabBtn} ${tab === "request" ? styles.tabBtnActive : ""}`}
                onClick={() => setTab("request")}
              >
                Request
              </button>
              <button
                className={`${styles.tabBtn} ${tab === "bookings" ? styles.tabBtnActive : ""}`}
                onClick={() => setTab("bookings")}
              >
                My Bookings
              </button>
            </div>
            <h2 id={titleId} className={styles.title}>
              {tab === "request" ? "Request a consultation" : "Check your status"}
            </h2>
          </div>
          <button ref={closeRef} type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.scroll}>
          {tab === "bookings" ? (
            <div>
              <div className={styles.importArea}>
                <p className={styles.label}>Import Booking</p>
                <form onSubmit={handleImportToken} className={styles.importRow}>
                  <input
                    type="text"
                    value={importTokenStr}
                    onChange={(e) => setImportTokenStr(e.target.value)}
                    placeholder="Paste private link or token..."
                    className={styles.input}
                  />
                  <button type="submit" className={styles.printBtn} style={{ padding: "0 14px", height: "auto" }}>
                    Add
                  </button>
                </form>
              </div>

              {historyTokens.length > 0 ? (
                <div>
                  <p className={styles.label} style={{ marginBottom: "var(--space-sm)" }}>Your History</p>
                  {historyTokens.map(token => (
                    <BookingStatusCard key={token} token={token} />
                  ))}
                </div>
              ) : (
                <p className={styles.lead} style={{ textAlign: "center", marginTop: "var(--space-2xl)" }}>
                  You don&apos;t have any localized bookings yet. Submit a new request or import an existing booking.
                </p>
              )}
            </div>
          ) : status === "sent" ? (
            <div className={styles.success}>
              <div className={styles.successMark}>✦</div>
              <h3 className={styles.successTitle}>Request received</h3>
              <p className={styles.successBody} style={{ marginBottom: "var(--space-md)" }}>
                Pending approval. We just saved your private tracking token to your device automatically.
              </p>
              <div className={styles.statusCard} style={{ margin: "0 auto var(--space-xl) auto", textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p className={styles.label}>Your Private Token (Save this!)</p>
                  <button 
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(lastToken);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    style={{ fontSize: "0.65rem", padding: "2px 6px", background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px", cursor: "pointer" }}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <code className={styles.codeBox} style={{ display: "block", marginTop: "var(--space-xs)", fontSize: "0.75rem", userSelect: "all", wordBreak: "break-all" }}>
                  {lastToken}
                </code>
              </div>
              <button 
                className={styles.printBtn} 
                onClick={() => {
                  setForm({ name: "", email: "", phone: "", service: "", date: "", notes: "" });
                  setStatus("idle");
                  setLastToken("");
                  setTab("bookings");
                }}
              >
                View Trackers
              </button>
            </div>
          ) : (
            <>
              <form id="portfolio-booking-form" onSubmit={handleSubmit} className={styles.form} noValidate>
                <div className={styles.field}>
                  <label htmlFor="pb-name" className={styles.label}>
                    Name
                  </label>
                  <input
                    id="pb-name"
                    name="name"
                    className={styles.input}
                    value={form.name}
                    onChange={handleChange}
                    required
                    autoComplete="name"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="pb-email" className={styles.label}>
                    Email
                  </label>
                  <input
                    id="pb-email"
                    name="email"
                    type="email"
                    className={styles.input}
                    value={form.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="pb-phone" className={styles.label}>
                    Phone / WhatsApp
                  </label>
                  <input
                    id="pb-phone"
                    name="phone"
                    type="tel"
                    className={styles.input}
                    value={form.phone}
                    onChange={handleChange}
                    required
                    autoComplete="tel"
                  />
                </div>
                <div className={styles.field}>
                  <span className={styles.label}>Preferred date</span>
                  {calendarLoadError ? <p className={styles.warn}>{calendarLoadError}</p> : null}
                  <BookingDatePicker
                    id="pb-date"
                    name="date"
                    value={form.date}
                    onChange={handleDateChange}
                    min={minDate}
                    disabledDates={disabledDates}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="pb-service" className={styles.label}>
                    Focus
                  </label>
                  <FocusServiceSelect
                    id="pb-service"
                    name="service"
                    value={form.service}
                    options={services}
                    placeholder="Choose a focus area…"
                    menuOpen={serviceMenuOpen}
                    onMenuOpenChange={setServiceMenuOpen}
                    onChange={handleChange}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="pb-notes" className={styles.label}>
                    Context (optional)
                  </label>
                  <textarea
                    id="pb-notes"
                    name="notes"
                    className={styles.textarea}
                    value={form.notes}
                    onChange={handleChange}
                    placeholder="Timeline, goals, links…"
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Consultation Duration</label>
                  <div className={styles.planGrid}>
                    {PLANS.map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        className={`${styles.planCard} ${selectedPlan?.id === plan.id ? styles.planCardActive : ""}`}
                        onClick={() => setSelectedPlan(plan)}
                      >
                        <p className={styles.planTitle}>{plan.title}</p>
                        <p className={styles.planDuration}>{plan.duration}</p>
                        <p className={styles.planPrice}>₵{plan.price.toLocaleString()}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {(status === "error" || submitError) && <p className={styles.error}>{submitError}</p>}
              </form>
            </>
          )}
        </div>

        {tab === "request" && (status === "payment" || status === "sending") && selectedPlan && (
          <div className={`${styles.footer} ${styles.paymentFooter}`}>
             <div style={{ marginBottom: 'var(--space-md)', textAlign: 'center' }}>
               <p className={styles.label}>Secure Checkout</p>
               <p style={{ fontSize: '1.2rem', margin: '4px 0' }}>₵{selectedPlan.price.toLocaleString()}</p>
               <p className={styles.lead} style={{ fontSize: '0.75rem', marginBottom: 0 }}>Pay with card or mobile money via Paystack.</p>
             </div>
             <button
              type="button"
              className={styles.submit}
              onClick={handleCompletePayment}
              disabled={status === "sending"}
            >
              {status === "sending" ? "Processing…" : `Pay ₵${selectedPlan.price.toLocaleString()} & Book`}
            </button>
            <button 
              type="button" 
              className={styles.tabBtn} 
              style={{ alignSelf: 'center', marginTop: '4px' }}
              onClick={() => setStatus("idle")}
              disabled={status === "sending"}
            >
              Go Back
            </button>
          </div>
        )}

        {tab === "request" && status !== "sent" && status !== "payment" && status !== "sending" ? (
          <div className={styles.footer}>
            <button
              type="submit"
              form="portfolio-booking-form"
              className={styles.submit}
            >
              Book Request
            </button>
            <p className={styles.wa}>
              Prefer chat?{" "}
              <a href="https://wa.me/233504148009" target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </p>
          </div>
        ) : tab === "bookings" ? (
           <div className={styles.footer}>
             <button type="button" className={styles.submit} onClick={onClose}>
               Close
             </button>
             <p className={styles.wa}>
               Save your token securely if switching devices.
             </p>
           </div>
        ) : null}
      </aside>
    </>
  );
}
