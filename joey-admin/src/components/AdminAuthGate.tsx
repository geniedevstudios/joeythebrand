"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import CuratedPill from "./CuratedPill";
import Image from "next/image";

export default function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | "loading">("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (session === "loading") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f5f1eb" }}>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: "3px solid rgba(28,30,34,0.18)",
              borderTopColor: "#1c1e22",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <p style={{ fontSize: "0.875rem", color: "rgba(28,30,34,0.72)" }}>Loading...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!session) {
    const devHref = (process.env.NEXT_PUBLIC_DEV_PORTFOLIO_URL || "").trim() || null;
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f1eb",
          padding: "2rem 1rem",
        }}
      >
        <div style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div
            style={{
              width: "100%",
              background: "#ffffff",
              borderRadius: 18,
              border: "1px solid rgba(182, 183, 186, 0.9)",
              boxShadow: "0 18px 50px rgba(28,30,34,0.10)",
              padding: "2.5rem",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 10 }}>
              <Image
                src="/white-logo.png"
                alt="JOEY THE BRAND"
                width={560}
                height={112}
                className="h-14 w-auto max-w-[16rem] object-contain opacity-95 invert sm:h-16 sm:max-w-[18rem]"
                priority
                sizes="18rem"
              />
              <div className="truncate text-xs font-semibold tracking-wide text-[#1c1e22]">
                Studio
              </div>
            </div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 650, color: "#1c1e22", margin: 0 }}>Sign In</h1>
            <p style={{ fontSize: "0.9rem", color: "rgba(28,30,34,0.65)", marginTop: 8 }}>Studio access</p>
          </div>

          <form onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            setIsLoading(true);
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
              setError(error.message);
            }
            setIsLoading(false);
          }}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 550, color: "rgba(28,30,34,0.80)", marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@joeythebrand.com"
                required
                style={{
                  width: "100%",
                  padding: "11px 12px",
                  border: "1px solid rgba(182,183,186,0.95)",
                  borderRadius: 10,
                  fontSize: "0.9rem",
                  outline: "none",
                  boxSizing: "border-box",
                  background: "#f5f1eb",
                  color: "#1c1e22",
                }}
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 550, color: "rgba(28,30,34,0.80)", marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={{
                    width: "100%",
                    padding: "10px 44px 10px 12px",
                    border: "1px solid rgba(182,183,186,0.95)",
                    borderRadius: 10,
                    fontSize: "0.9rem",
                    outline: "none",
                    boxSizing: "border-box",
                    background: "#f5f1eb",
                    color: "#1c1e22",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute",
                    right: 4,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 36,
                    height: 36,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "none",
                    background: "transparent",
                    borderRadius: 6,
                    cursor: "pointer",
                    color: "rgba(28,30,34,0.65)",
                  }}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p
                style={{
                  color: "#fecaca",
                  fontSize: "0.85rem",
                  marginBottom: "1rem",
                  background: "rgba(220, 38, 38, 0.12)",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(220, 38, 38, 0.35)",
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                background: isLoading ? "rgba(28,30,34,0.45)" : "#1c1e22",
                color: "#f5f1eb",
                border: "1px solid rgba(28,30,34,0.2)",
                borderRadius: 9999,
                padding: "12px 0",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: isLoading ? "not-allowed" : "pointer",
                transition: "transform 0.2s, opacity 0.2s",
              }}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "center" }}>
          <CuratedPill devHref="https://geniedevstudios.com/services" />
        </div>
      </div>
      </div>
    );
  }

  return <>{children}</>;
}
