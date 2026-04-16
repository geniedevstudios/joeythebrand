"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

export default function InlineNewsletterForm({ idPrefix }: { idPrefix: string }) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Please enter your email address.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; message?: string };

      if (res.status === 429) {
        toast.error("Too many attempts. Try again in a few minutes.");
        return;
      }
      if (!res.ok) {
        toast.error(data.error || "Could not subscribe. Try again later.");
        return;
      }
      setEmail("");
      const already = Boolean((data as { alreadySubscribed?: boolean }).alreadySubscribed);
      const message =
        (data as { message?: string }).message ||
        (already ? "You’re already subscribed." : "You’re on the list. Welcome to the clan.");
      if (already) toast.info(message);
      else toast.success(message);
    } catch {
      toast.error("Something went wrong. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <label
            htmlFor={`${idPrefix}-email`}
            style={{
              display: "block",
              fontFamily: "var(--font-label)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontSize: "0.65rem",
              color: "rgba(255,255,255,0.72)",
              marginBottom: 6,
            }}
          >
            Email
          </label>
          <input
            id={`${idPrefix}-email`}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            style={{
              width: "100%",
              padding: "0.6rem 0.75rem",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.10)",
              color: "#fff",
              outline: "none",
            }}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          style={{
            padding: "0.65rem 1rem",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.22)",
            background: "rgba(255,255,255,0.16)",
            color: "#fff",
            fontFamily: "var(--font-label)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontSize: "0.72rem",
            cursor: pending ? "not-allowed" : "pointer",
            opacity: pending ? 0.75 : 1,
          }}
        >
          {pending ? "…" : "Subscribe"}
        </button>
      </div>
      <p style={{ margin: "10px 0 0", fontSize: "0.82rem", color: "rgba(255,255,255,0.72)" }}>
        <Link href="/privacy" style={{ color: "rgba(255,255,255,0.86)", textDecoration: "underline" }}>
          Privacy Policy
        </Link>{" "}
        — how we use your email.
      </p>
    </form>
  );
}

