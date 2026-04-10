"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

export default function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | "loading">("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#fafaf9" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 32, height: 32, border: "3px solid #e4e4e7", borderTopColor: "#09090b", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ fontSize: "0.875rem", color: "#71717a" }}>Loading...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fafaf9", padding: "1rem" }}>
        <div style={{ width: "100%", maxWidth: 400, background: "white", borderRadius: 16, border: "1px solid #e4e4e7", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", padding: "2.5rem" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{ fontFamily: "var(--font-geist-mono, monospace)", fontWeight: 700, fontSize: "1.1rem", letterSpacing: "0.05em", marginBottom: 4 }}>
              JTB ADMIN
            </div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#09090b", margin: 0 }}>Sign In</h1>
            <p style={{ fontSize: "0.875rem", color: "#71717a", marginTop: 6 }}>Management Portal Access</p>
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
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@joeythebrand.com"
                required
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {error && (
              <p style={{ color: "#dc2626", fontSize: "0.8rem", marginBottom: "1rem", background: "#fef2f2", padding: "8px 12px", borderRadius: 6, border: "1px solid #fecaca" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              style={{ width: "100%", background: isLoading ? "#52525b" : "#09090b", color: "white", border: "none", borderRadius: 8, padding: "11px 0", fontWeight: 600, fontSize: "0.875rem", cursor: isLoading ? "not-allowed" : "pointer", transition: "background 0.2s" }}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
