"use client";

import { type FormEvent, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import styles from "./SubscribeForm.module.css";

type BtnState = "idle" | "loading" | "subscribed" | "already";

export default function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [btn, setBtn] = useState<BtnState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isValid = useMemo(() => {
    const trimmed = email.trim();
    if (!trimmed) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  }, [email]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setErrorMsg(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmed }),
        });

        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          message?: string;
          alreadySubscribed?: boolean;
        } | null;

        if (!res.ok || !data?.ok) {
          setBtn("idle");
          const msg = data?.message ?? "Could not subscribe. Please try again.";
          setErrorMsg(msg);
          toast.error(msg);
          return;
        }

        setEmail("");

        if (data.alreadySubscribed) {
          setBtn("already");
          toast.info("You're already subscribed.");
        } else {
          setBtn("subscribed");
          toast.success("You've successfully subscribed to our newsletter.");
        }
      } catch {
        setBtn("idle");
        const msg = "Network error. Please try again.";
        setErrorMsg(msg);
        toast.error(msg);
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
          onChange={(ev) => {
            setEmail(ev.target.value);
            if (btn === "subscribed" || btn === "already") {
              setBtn("idle");
              setErrorMsg(null);
            }
          }}
          aria-invalid={Boolean(errorMsg)}
          required
        />
        <button
          className={`btn btnPrimary ${styles.btnState} ${
            btn === "subscribed" ? styles.btnDone : btn === "already" ? styles.btnDup : ""
          }`}
          type="submit"
          disabled={!isValid || isPending || btn === "subscribed" || btn === "already"}
        >
          {isPending ? (
            "Submitting…"
          ) : btn === "subscribed" ? (
            <span className={styles.btnInner}>
              Subscribed
              <Check />
            </span>
          ) : btn === "already" ? (
            <span className={styles.btnInner}>
              Already subscribed
              <Check />
            </span>
          ) : (
            "Subscribe"
          )}
        </button>
      </div>
      {errorMsg ? (
        <p className={styles.err} role="alert">
          {errorMsg}
        </p>
      ) : null}
    </form>
  );
}

function Check() {
  return (
    <svg className={styles.check} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19l12-12-1.41-1.41L9 16.17z" />
    </svg>
  );
}
