"use client";

import { type FormEvent, useMemo, useState, useTransition } from "react";
import styles from "./SubscribeForm.module.css";

type Status = "idle" | "success" | "error";

export default function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isValid = useMemo(() => {
    const trimmed = email.trim();
    if (!trimmed) return false;
    // Lightweight validation—server still validates.
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  }, [email]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("idle");
    setMessage(null);

    const trimmed = email.trim();
    if (!trimmed) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmed }),
        });

        const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;

        if (!res.ok || !data?.ok) {
          setStatus("error");
          setMessage(data?.message ?? "Could not subscribe. Please try again.");
          return;
        }

        setStatus("success");
        setMessage("You’re on the list. Watch your inbox.");
        setEmail("");
      } catch {
        setStatus("error");
        setMessage("Network error. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} aria-label="Newsletter subscribe">
      <div className={styles.row}>
        <input
          className={styles.input}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@domain.com"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          aria-invalid={status === "error"}
          required
        />
        <button className="btn btnPrimary" type="submit" disabled={!isValid || isPending}>
          {isPending ? "Submitting…" : "Subscribe"}
        </button>
      </div>
      {message ? (
        <p
          className={`${styles.status} ${status === "success" ? styles.statusSuccess : ""}`}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}

