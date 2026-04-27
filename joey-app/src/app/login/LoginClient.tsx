"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./LoginClient.module.css";
import PageHeroShellImageLoader from "@/components/page-hero/PageHeroShellImageLoader";
import { PAGE_HERO_SHELL_CLASS, usePageHeroShellRenderProps } from "@/hooks/usePageHero";
import { authStore } from "@/store/authStore";

export default function LoginClient() {
  const router = useRouter();
  const {
    empty: loginHeroEmpty,
    shellSpinner: loginHeroSpinner,
    style: loginHeroStyle,
    showImageLoader: loginHeroImageLoader,
  } = usePageHeroShellRenderProps("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email || !password) return;

    try {
      setStatus("loading");
      await authStore.signIn(email.trim(), password);
      router.push("/account");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Sign in failed. Please try again.");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <div className={styles.page}>
      <div
        className={`${PAGE_HERO_SHELL_CLASS} ${styles.topHero}`}
        data-page-hero-empty={loginHeroEmpty ? "true" : "false"}
        data-page-hero-loading={loginHeroSpinner ? "true" : "false"}
        style={loginHeroStyle}
        aria-hidden
      >
        {loginHeroImageLoader ? <PageHeroShellImageLoader /> : null}
      </div>
      <div className={styles.container}>
        
        {/* Decorative Brand Element */}
        <div className={styles.brandMark}>
          <h2>J <span className={styles.dot}>.</span></h2>
        </div>

        <div className={styles.card}>
          <h1 className={`t-heading ${styles.title}`}>
            Client Access
          </h1>
          <p className={styles.subtitle}>
            Sign in to access your account.
          </p>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className="form-group">
              <label htmlFor="email" className="form-label visually-hidden">Email Address</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label visually-hidden">Password</label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {errorMsg ? (
              <p className={styles.subtitle} style={{ color: "#c02626" }}>
                {errorMsg}
              </p>
            ) : null}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
              disabled={status === "loading" || !email || !password}
            >
              {status === "loading" ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className={styles.footer}>
            <p>Don&apos;t have an account? <Link href="/contact" className={styles.link}>Contact us for bespoke access.</Link></p>
          </div>
        </div>

      </div>
    </div>
  );
}
