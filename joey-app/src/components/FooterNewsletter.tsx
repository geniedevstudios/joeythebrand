"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import styles from "./Footer.module.css";

export default function FooterNewsletter() {
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
      if (already) {
        toast.info(message);
      } else {
        toast.success(message);
      }
    } catch {
      toast.error("Something went wrong. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section id="footer-newsletter" className={styles.newsletter} aria-labelledby="footer-newsletter-heading">
      <h3 id="footer-newsletter-heading" className={styles.newsletterTitle}>
        Join the clan
      </h3>
      <p className={styles.newsletterIntro}>
        Be first to know about new collections, events, and exclusive experiences.
      </p>
      <form className={styles.newsletterForm} onSubmit={handleSubmit} noValidate>
        <div className={styles.newsletterField}>
          <label htmlFor="footer-newsletter-email" className={styles.newsletterLabel}>
            Email
          </label>
          <input
            id="footer-newsletter-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.newsletterInput}
            disabled={pending}
          />
        </div>
        <button type="submit" className={styles.newsletterBtn} disabled={pending}>
          {pending ? "…" : "Subscribe"}
        </button>
      </form>
      <p className={styles.newsletterPrivacy}>
        <Link href="/privacy" className={styles.newsletterPrivacyLink}>
          Privacy Policy
        </Link>
        <span> — how we use your email.</span>
      </p>
    </section>
  );
}
