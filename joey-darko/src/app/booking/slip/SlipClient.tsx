"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { openConsultationPrintWindow, type SlipPayload } from "@/lib/printConsultation";
import { formatConsultationAppointmentLocal } from "@/lib/formatConsultationAppointment";
import styles from "../booking.module.css";

type ApiSlip = SlipPayload;
type ApiSlipResponse = ({ ok: true } & ApiSlip) | { ok: false; error: string };

function formatDateShort(iso?: string) {
  if (!iso?.trim()) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    timeZone: "Africa/Accra",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function SlipClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [slip, setSlip] = useState<ApiSlip | null>(null);
  const [autoPayStatus, setAutoPayStatus] = useState<"" | "checking" | "timed_out">("");

  const load = useCallback(async () => {
    const t =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("token")?.trim() || ""
        : "";
    if (!t) {
      setError("Missing booking link. Use the link from your confirmation after you submitted the form.");
      setSlip(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/booking/slip?token=${encodeURIComponent(t)}`);
      const data = (await res.json()) as ApiSlipResponse;
      if (!data.ok) throw new Error(data.error || "Could not load booking.");
      setSlip(data);
    } catch (e) {
      setSlip(null);
      setError(e instanceof Error ? e.message : "Could not load booking.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();

    const onRefresh = () => { void load(); };
    window.addEventListener("joeyydarko-refresh", onRefresh);
    return () => window.removeEventListener("joeyydarko-refresh", onRefresh);
  }, [load]);

  useEffect(() => {
    if (!slip) return;
    if (slip.paymentStatus === "paid") {
      setAutoPayStatus("");
      return;
    }
    if (slip.status !== "pending") {
      setAutoPayStatus("");
      return;
    }
    if (!slip.bookingId || !slip.paymentRef) {
      setAutoPayStatus("");
      return;
    }

    let stopped = false;
    setAutoPayStatus("checking");

    const startedAt = Date.now();
    const tick = async () => {
      if (stopped) return;
      if (Date.now() - startedAt > 2 * 60 * 1000) {
        setAutoPayStatus("timed_out");
        return;
      }
      try {
        await fetch("/api/paystack/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: slip.paymentRef, bookingId: slip.bookingId }),
        });
      } catch {
        // ignore network errors; we'll retry
      } finally {
        await load();
      }
    };

    const interval = window.setInterval(() => { void tick(); }, 8000);
    void tick();

    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [slip, load]);

  const onPrint = () => {
    if (!slip) return;
    openConsultationPrintWindow(slip);
  };

  if (loading) {
    return (
      <section className={styles.slipSection}>
        <div className="container">
          <p className={styles.slipMuted}>Loading your booking…</p>
        </div>
      </section>
    );
  }

  if (error || !slip) {
    return (
      <section className={styles.slipSection}>
        <div className="container">
          <h1 className={`t-display ${styles.slipTitle}`}>Booking link</h1>
          <p className={styles.errorMsg}>{error || "Something went wrong."}</p>
          <p className={styles.slipMuted}>
            <Link href="/?consult=1">Book again</Link>
          </p>
        </div>
      </section>
    );
  }

  if (slip.status === "pending") {
    return (
      <section className={styles.slipSection}>
        <div className="container">
          <div className={styles.slipCard}>
            <h1 className={`t-display ${styles.slipTitle}`}>Pending approval</h1>
            <p className={styles.slipLead}>
              Thanks — we received your request for <strong>{formatDateShort(slip.preferredDate)}</strong>. We&apos;ll
              confirm soon; once approved, your <strong>booking code</strong> and appointment time will show here.
            </p>
            <p className={styles.slipMuted}>Bookmark this page and check back, or refresh below.</p>
            {slip.paymentStatus !== "paid" && autoPayStatus === "checking" ? (
              <p className={styles.slipMuted}>Payment is pending — checking automatically…</p>
            ) : null}
            {slip.paymentStatus !== "paid" && autoPayStatus === "timed_out" ? (
              <p className={styles.slipMuted}>
                Payment is still pending. Complete it in your MoMo/bank app, then refresh this page.
              </p>
            ) : null}
            <button type="button" className={styles.btnOutline} onClick={() => void load()}>
              Refresh status
            </button>
            <p className={styles.slipMuted}>
              <Link href="/?consult=1">New request</Link>
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (slip.status === "reschedule_proposed") {
    return (
      <section className={styles.slipSection}>
        <div className="container">
          <div className={styles.slipCard}>
            <h1 className={`t-display ${styles.slipTitle}`}>Reschedule proposed</h1>
            <p className={styles.slipLead}>
              We proposed a new time for your session:{" "}
              <strong>{formatConsultationAppointmentLocal(slip.proposedScheduledAt)}</strong>.
            </p>
            {slip.rescheduleNote ? (
              <p className={styles.slipMuted}>Note from Joey: {slip.rescheduleNote}</p>
            ) : null}
            <p className={styles.slipMuted}>
              Please check your email for your secure single-use link to accept this date or request another time.
            </p>
            <button type="button" className={styles.btnOutline} onClick={() => void load()}>
              Refresh status
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (slip.status === "declined" || slip.status === "cancelled") {
    return (
      <section className={styles.slipSection}>
        <div className="container">
          <div className={styles.slipCard}>
            <h1 className={`t-display ${styles.slipTitle}`}>
              {slip.status === "cancelled" ? "Booking cancelled" : "Request not confirmed"}
            </h1>
            <p className={styles.slipLead}>
              {slip.status === "cancelled"
                ? "This consultation booking has been cancelled."
                : "We weren't able to confirm this slot. Please reach us on WhatsApp to find another time."}
            </p>
            {slip.cancellationReason ? (
              <p className={styles.slipMuted}>Reason: {slip.cancellationReason}</p>
            ) : null}
            {slip.refundReviewRequired ? (
              <p className={styles.slipMuted}>
                Your deposit has been flagged for manual review by our team in accordance with our business policy.
              </p>
            ) : null}
            <a href="https://wa.me/233504148009" className={styles.btnPrimary} target="_blank" rel="noopener noreferrer">
              WhatsApp Joey
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.slipSection}>
      <div className="container">
        <div className={styles.slipCard}>
          <h1 className={`t-display ${styles.slipTitle}`}>You&apos;re confirmed</h1>
          <p className={styles.slipLead}>
            Your booking code is <code className={styles.code}>{slip.bookingCode || "—"}</code>
          </p>
          <ul className={styles.slipList}>
            <li>
              <span className={styles.slipListLabel}>Service</span> {slip.service}
            </li>
            <li>
              <span className={styles.slipListLabel}>Scheduled</span>{" "}
              {slip.scheduledAt ? formatConsultationAppointmentLocal(slip.scheduledAt) : "—"}
            </li>
          </ul>
          <div className={styles.submitRow}>
            <button type="button" className={styles.btnPrimary} onClick={onPrint}>
              Print / Save PDF
            </button>
            <a href="https://wa.me/233504148009" className={styles.btnOutline} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
          </div>
          <p className={styles.slipMuted}>
            <button type="button" className={styles.textLink} onClick={() => void load()}>
              Refresh
            </button>
          </p>
        </div>
      </div>
    </section>
  );
}
