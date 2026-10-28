"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "../booking.module.css";

type ProposalInfo = {
  id: string;
  customerName: string;
  service: string;
  preferredFormatted: string;
  proposedScheduledAt: string;
  proposedFormatted: string;
  rescheduleNote?: string;
  slipToken?: string;
};

const TIME_SLOTS = [
  { value: "08:00", label: "8:00 AM" },
  { value: "08:30", label: "8:30 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "09:30", label: "9:30 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "10:30", label: "10:30 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "11:30", label: "11:30 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "12:30", label: "12:30 PM" },
  { value: "13:00", label: "1:00 PM" },
  { value: "13:30", label: "1:30 PM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "14:30", label: "2:30 PM" },
  { value: "15:00", label: "3:00 PM" },
];

function PortfolioRescheduleInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() || "";
  const initialIntent = searchParams.get("intent") === "another" ? "another" : "accept";

  const [mode, setMode] = useState<"accept" | "another">(initialIntent);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [proposal, setProposal] = useState<ProposalInfo | null>(null);
  const [doneState, setDoneState] = useState<null | {
    action: "accept" | "request_another_time";
    bookingCode?: string;
    slipToken?: string;
  }>(null);

  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("10:00");
  const [message, setMessage] = useState("");

  const loadProposal = useCallback(async () => {
    if (!token) {
      setError("Missing reschedule response link.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/consultation/reschedule?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Invalid or expired reschedule link.");
      }
      setProposal(data.booking);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load reschedule proposal.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadProposal();
  }, [loadProposal]);

  const handleAccept = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/consultation/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "accept" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Could not confirm reschedule.");
      }
      setDoneState({
        action: "accept",
        bookingCode: data.bookingCode,
        slipToken: data.slipToken || proposal?.slipToken,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm reschedule.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestAnother = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preferredDate.trim() && !message.trim()) {
      setError("Please select a preferred date or leave a note for Joey.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/consultation/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          action: "request_another_time",
          preferredDate: preferredDate.trim() || undefined,
          preferredTime: preferredDate.trim() ? preferredTime : undefined,
          message: message.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Could not submit your response.");
      }
      setDoneState({
        action: "request_another_time",
        slipToken: data.slipToken || proposal?.slipToken,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your response.");
    } finally {
      setSubmitting(false);
    }
  };

  const minDate = new Date().toISOString().slice(0, 10);

  if (loading) {
    return (
      <section className={styles.slipSection}>
        <div className="container">
          <p className={styles.slipMuted}>Loading reschedule proposal…</p>
        </div>
      </section>
    );
  }

  if (doneState) {
    const slipHref = doneState.slipToken
      ? `/booking/slip?token=${encodeURIComponent(doneState.slipToken)}`
      : "/?consult=1";
    return (
      <section className={styles.slipSection}>
        <div className="container">
          <div className={styles.slipCard}>
            <h1 className={`t-display ${styles.slipTitle}`}>
              {doneState.action === "accept"
                ? "You're confirmed"
                : "Request sent for review"}
            </h1>
            {doneState.action === "accept" ? (
              <>
                <p className={styles.slipLead}>
                  Your session is confirmed for <strong>{proposal?.proposedFormatted}</strong>.
                </p>
                {doneState.bookingCode ? (
                  <p className={styles.slipLead}>
                    Booking code: <code className={styles.code}>{doneState.bookingCode}</code>
                  </p>
                ) : null}
              </>
            ) : (
              <p className={styles.slipLead}>
                We have shared your preferred time with Joey and returned your request for review.
              </p>
            )}
            <div className={styles.submitRow}>
              <Link href={slipHref} className={styles.btnPrimary}>
                View Booking Status
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!proposal) {
    return (
      <section className={styles.slipSection}>
        <div className="container">
          <div className={styles.slipCard}>
            <h1 className={`t-display ${styles.slipTitle}`}>Reschedule link</h1>
            <p className={styles.errorMsg}>{error || "Invalid or expired link."}</p>
            <p className={styles.slipMuted}>
              <Link href="/?consult=1">Back to bookings</Link>
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.slipSection}>
      <div className="container">
        <div className={styles.slipCard}>
          <h1 className={`t-display ${styles.slipTitle}`}>Proposed appointment time</h1>
          <p className={styles.slipLead}>
            Hello <strong>{proposal.customerName}</strong>, please review the proposed schedule for your{" "}
            <strong>{proposal.service}</strong> consultation.
          </p>

          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.16)",
              padding: "16px 20px",
              marginBottom: "20px",
            }}
          >
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7, marginBottom: 4 }}>
              Proposed Date &amp; Time (Africa/Accra)
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>
              {proposal.proposedFormatted}
            </div>
            {proposal.rescheduleNote ? (
              <p style={{ marginTop: 10, marginBottom: 0, fontSize: "0.9rem", opacity: 0.9 }}>
                <strong>Note from Joey:</strong> {proposal.rescheduleNote}
              </p>
            ) : null}
          </div>

          {error ? <p className={styles.errorMsg}>{error}</p> : null}

          {mode === "accept" ? (
            <div className={styles.submitRow}>
              <button
                type="button"
                className={styles.btnPrimary}
                disabled={submitting}
                onClick={handleAccept}
              >
                {submitting ? "Confirming…" : "Accept New Date"}
              </button>
              <button
                type="button"
                className={styles.btnOutline}
                disabled={submitting}
                onClick={() => {
                  setError("");
                  setMode("another");
                }}
              >
                Request Another Time
              </button>
            </div>
          ) : (
            <form onSubmit={handleRequestAnother} style={{ display: "grid", gap: "14px", marginTop: "16px" }}>
              <div>
                <label htmlFor="ur-resched-date" style={{ display: "block", fontSize: "0.8rem", marginBottom: 6 }}>
                  Preferred Date (Africa/Accra)
                </label>
                <input
                  id="ur-resched-date"
                  type="date"
                  min={minDate}
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", background: "#111", color: "#fff", border: "1px solid #333" }}
                />
              </div>
              <div>
                <label htmlFor="ur-resched-time" style={{ display: "block", fontSize: "0.8rem", marginBottom: 6 }}>
                  Preferred Time (8:00 AM – 3:00 PM GMT)
                </label>
                <select
                  id="ur-resched-time"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", background: "#111", color: "#fff", border: "1px solid #333" }}
                >
                  {TIME_SLOTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label} (GMT)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ur-resched-msg" style={{ display: "block", fontSize: "0.8rem", marginBottom: 6 }}>
                  Note for Joey
                </label>
                <textarea
                  id="ur-resched-msg"
                  rows={3}
                  placeholder="Share what dates or times work best for you…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", background: "#111", color: "#fff", border: "1px solid #333" }}
                />
              </div>
              <div className={styles.submitRow}>
                <button type="submit" className={styles.btnPrimary} disabled={submitting}>
                  {submitting ? "Submitting…" : "Send Request"}
                </button>
                <button
                  type="button"
                  className={styles.btnOutline}
                  disabled={submitting}
                  onClick={() => {
                    setError("");
                    setMode("accept");
                  }}
                >
                  Back
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

export default function PortfolioReschedulePage() {
  return (
    <Suspense
      fallback={
        <section className={styles.slipSection}>
          <div className="container">
            <p className={styles.slipMuted}>Loading…</p>
          </div>
        </section>
      }
    >
      <PortfolioRescheduleInner />
    </Suspense>
  );
}
