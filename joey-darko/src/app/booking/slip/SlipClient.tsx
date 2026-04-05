"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { openConsultationPrintWindow, type SlipPayload } from "@/lib/printConsultation";
import styles from "../booking.module.css";

type ApiSlip = SlipPayload;

function formatDateShort(iso?: string) {
  if (!iso?.trim()) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function SlipClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [slip, setSlip] = useState<ApiSlip | null>(null);

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
      const data = (await res.json()) as ApiSlip & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Could not load booking.");
      }
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

  if (slip.status === "declined") {
    return (
      <section className={styles.slipSection}>
        <div className="container">
          <div className={styles.slipCard}>
            <h1 className={`t-display ${styles.slipTitle}`}>Request not confirmed</h1>
            <p className={styles.slipLead}>
              We weren&apos;t able to confirm this slot. Please reach us on WhatsApp to find another time.
            </p>
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
              {slip.scheduledAt ? new Date(slip.scheduledAt).toLocaleString() : "—"}
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
