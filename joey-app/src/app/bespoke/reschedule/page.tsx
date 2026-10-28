"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type ProposalInfo = {
  id: string;
  customerName: string;
  service: string;
  preferredFormatted: string;
  proposedScheduledAt: string;
  proposedFormatted: string;
  rescheduleNote?: string;
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

function RescheduleResponseInner() {
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
      setDoneState({ action: "accept", bookingCode: data.bookingCode });
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
      setDoneState({ action: "request_another_time" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your response.");
    } finally {
      setSubmitting(false);
    }
  };

  const minDate = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ paddingTop: "var(--nav-height)", minHeight: "80vh", background: "#f9f9f9" }}>
      <div className="container" style={{ maxWidth: 640, padding: "64px 20px" }}>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e5e5e5",
            borderRadius: 12,
            padding: "40px 32px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
          }}
        >
          {loading ? (
            <p style={{ textAlign: "center", color: "#555" }}>Loading reschedule proposal…</p>
          ) : doneState ? (
            <div style={{ textAlign: "center" }}>
              <h1 className="t-display" style={{ fontSize: "2rem", marginBottom: 12 }}>
                {doneState.action === "accept"
                  ? "Appointment Confirmed"
                  : "Request Sent for Review"}
              </h1>
              {doneState.action === "accept" ? (
                <>
                  <p style={{ color: "#444", lineHeight: 1.6, marginBottom: 16 }}>
                    Your bespoke consultation is now confirmed for{" "}
                    <strong>{proposal?.proposedFormatted}</strong>.
                  </p>
                  {doneState.bookingCode ? (
                    <p style={{ marginBottom: 24 }}>
                      Booking Code:{" "}
                      <code
                        style={{
                          padding: "6px 12px",
                          background: "#f3f4f6",
                          borderRadius: 6,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                        }}
                      >
                        {doneState.bookingCode}
                      </code>
                    </p>
                  ) : null}
                </>
              ) : (
                <p style={{ color: "#444", lineHeight: 1.6, marginBottom: 24 }}>
                  We have shared your preferred time with Joey and returned your booking for review. You will receive an update shortly.
                </p>
              )}
              <Link href="/account" className="btn btn-primary">
                View in Account
              </Link>
            </div>
          ) : !proposal ? (
            <div style={{ textAlign: "center" }}>
              <h1 className="t-display" style={{ fontSize: "1.8rem", marginBottom: 12 }}>
                Reschedule Link Unavailable
              </h1>
              <p style={{ color: "#b91c1c", marginBottom: 24 }}>{error}</p>
              <Link href="/account" className="btn btn-primary">
                Go to My Account
              </Link>
            </div>
          ) : (
            <div>
              <span className="section-label" style={{ display: "block", marginBottom: 8 }}>
                Bespoke Consultation
              </span>
              <h1 className="t-display" style={{ fontSize: "2rem", marginBottom: 12 }}>
                Proposed Appointment Time
              </h1>
              <p style={{ color: "#444", lineHeight: 1.6, marginBottom: 24 }}>
                Hello <strong>{proposal.customerName}</strong>, please review the proposed schedule for your{" "}
                <strong>{proposal.service}</strong> session below.
              </p>

              <div
                style={{
                  background: "#f7f7f7",
                  border: "1px solid #e5e5e5",
                  borderRadius: 8,
                  padding: "20px",
                  marginBottom: 24,
                }}
              >
                <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "#666", marginBottom: 4 }}>
                  Proposed Date &amp; Time (Africa/Accra)
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#111" }}>
                  {proposal.proposedFormatted}
                </div>
                {proposal.rescheduleNote ? (
                  <p style={{ marginTop: 12, marginBottom: 0, fontSize: 14, color: "#333" }}>
                    <strong>Note from JOEY:</strong> {proposal.rescheduleNote}
                  </p>
                ) : null}
              </div>

              {error ? (
                <p style={{ color: "#b91c1c", fontSize: 14, marginBottom: 16 }}>{error}</p>
              ) : null}

              {mode === "accept" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={submitting}
                    onClick={handleAccept}
                  >
                    {submitting ? "Confirming…" : "Accept New Date & Confirm"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={submitting}
                    onClick={() => {
                      setError("");
                      setMode("another");
                    }}
                  >
                    Request Another Time Instead
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRequestAnother} style={{ display: "grid", gap: 16 }}>
                  <div className="form-group">
                    <label htmlFor="resched-date" className="form-label">
                      Preferred Alternative Date (Africa/Accra)
                    </label>
                    <input
                      id="resched-date"
                      type="date"
                      min={minDate}
                      className="form-input"
                      value={preferredDate}
                      onChange={(e) => setPreferredDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="resched-time" className="form-label">
                      Preferred Time (8:00 AM – 3:00 PM GMT)
                    </label>
                    <select
                      id="resched-time"
                      className="form-input"
                      value={preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
                    >
                      {TIME_SLOTS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label} (GMT)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="resched-msg" className="form-label">
                      Note for Joey
                    </label>
                    <textarea
                      id="resched-msg"
                      className="form-textarea"
                      placeholder="Let us know what dates or times work best for you…"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                      {submitting ? "Sending…" : "Submit Alternative Time"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={submitting}
                      onClick={() => {
                        setError("");
                        setMode("accept");
                      }}
                    >
                      Back to Proposed Time
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BespokeReschedulePage() {
  return (
    <Suspense fallback={<div style={{ padding: "120px 20px", textAlign: "center" }}>Loading…</div>}>
      <RescheduleResponseInner />
    </Suspense>
  );
}
