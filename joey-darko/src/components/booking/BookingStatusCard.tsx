"use client";

import { useCallback, useEffect, useState } from "react";
import { openConsultationPrintWindow, type SlipPayload } from "@/lib/printConsultation";
import styles from "./bookingDrawer.module.css";

type ApiSlip = SlipPayload;
type ApiSlipResponse = ({ ok: true } & ApiSlip) | { ok: false; error: string };

function formatDateShort(iso?: string) {
  if (!iso?.trim()) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatPreferredSlot(dateIso?: string, time24?: string) {
  const date = formatDateShort(dateIso);
  if (!time24?.trim() || date === "—") return date;
  const m = /^(\d{2}):(\d{2})$/.exec(time24.trim());
  if (!m) return `${date} • ${time24.trim()}`;
  const h = Number(m[1]);
  const mm = m[2];
  const hour12 = ((h + 11) % 12) + 1;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${date} • ${hour12}:${mm} ${ampm}`;
}

export default function BookingStatusCard({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [slip, setSlip] = useState<ApiSlip | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    if (!slip) setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/booking/slip?token=${encodeURIComponent(token)}`);
      const data = (await res.json()) as ApiSlipResponse;
      if (!data.ok) throw new Error(data.error || "Could not load booking.");
      setSlip(data);
    } catch (e) {
      setSlip(null);
      setError(e instanceof Error ? e.message : "Could not load booking.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
    const onRefresh = () => { void load(); };
    window.addEventListener("joeyydarko-refresh", onRefresh);
    return () => window.removeEventListener("joeyydarko-refresh", onRefresh);
  }, [load]);

  const onPrint = () => {
    if (!slip) return;
    openConsultationPrintWindow(slip);
  };

  if (loading) {
    return (
      <div className={styles.statusCard}>
        <p className={styles.loadMuted}>Loading booking details…</p>
      </div>
    );
  }

  if (error || !slip) {
    return (
      <div className={styles.statusCard}>
        <p className={styles.statusError}>{error}</p>
        <p className={styles.tokenHint}>Token: {token}</p>
      </div>
    );
  }

  if (slip.status === "pending") {
    return (
      <div className={styles.statusCard}>
        <div className={styles.statusHeader}>
          <span className={styles.badgePending}>Pending</span>
          <span className={styles.serviceTag}>{slip.service}</span>
        </div>
        <p className={styles.statusLead}>
          Request for <strong>{formatPreferredSlot(slip.preferredDate, slip.preferredTime)}</strong> is pending review.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
          <span className={styles.serviceTag}>{slip.durationHours ? `${slip.durationHours}h Session` : "—"}</span>
          <span className={slip.paymentStatus === 'paid' ? styles.badgeConfirmed : styles.badgePending}>
            {slip.paymentStatus === 'paid' ? "Paid" : "Unpaid"}
          </span>
        </div>
        <p className={styles.loadMuted}>We will confirm your exact appointment soon.</p>
      </div>
    );
  }

  if (slip.status === "declined") {
    return (
      <div className={styles.statusCard}>
        <div className={styles.statusHeader}>
          <span className={styles.badgeDeclined}>Not confirmed</span>
          <span className={styles.serviceTag}>{slip.service}</span>
        </div>
        <p className={styles.statusLead}>We weren&apos;t able to confirm this slot.</p>
        <a href={`https://wa.me/233504148009`} className={styles.waLink} target="_blank" rel="noopener noreferrer">
          WhatsApp Joey to reschedule
        </a>
      </div>
    );
  }

  return (
    <div className={`${styles.statusCard} ${styles.statusCardConfirmed}`}>
      <div className={styles.statusHeader}>
        <span className={styles.badgeConfirmed}>Confirmed</span>
        <span className={styles.serviceTag}>{slip.service}</span>
      </div>
      <p className={styles.statusLead}>
        Code: <code className={styles.codeBox}>{slip.bookingCode || "—"}</code>
      </p>
      <div className={styles.appointmentTime}>
        <strong>Scheduled Time:</strong><br />
        {slip.scheduledAt ? new Date(slip.scheduledAt).toLocaleString() : "—"}<br />
        <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>
          {slip.durationHours}h Session · ₵{slip.priceGhs?.toLocaleString()} · {slip.paymentStatus === 'paid' ? "Paid" : "Unpaid"}
        </span>
      </div>
      <div className={styles.actionRow}>
        <button type="button" className={styles.printBtn} onClick={onPrint}>
          Print Slip
        </button>
      </div>
    </div>
  );
}
