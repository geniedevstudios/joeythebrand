"use client";
import { useState, useSyncExternalStore, useEffect, useRef } from "react";
import Link from "next/link";
import { authStore } from "@/store/authStore";
import styles from "./account.module.css";

type Mode = "signin" | "signup";

export default function AccountClient() {
  const user = useSyncExternalStore(authStore.subscribe, authStore.getUser, () => null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  if (user) {
    const initials = authStore.getInitials();
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div className="container">
            <span className="section-label">Welcome back</span>
            <h1 className={styles.pageTitle}>{user.name}</h1>
            <p className={styles.email}>{user.email}</p>
          </div>
        </div>

        <div className="container">
          <div className={styles.profileHeader}>
            <div className={styles.avatarContainer} ref={menuRef}>
              <button 
                className={styles.profileAvatar} 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-expanded={isMenuOpen}
                aria-haspopup="true"
              >
                {initials}
              </button>
              
              {isMenuOpen && (
                <div className={styles.avatarDropdown}>
                  <Link href="/contact" className={styles.dropdownItem} onClick={() => setIsMenuOpen(false)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span>Report an Issue</span>
                  </Link>
                  <button className={styles.dropdownItem} onClick={() => { authStore.signOut(); setIsMenuOpen(false); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={styles.grid}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Recent Orders</h2>
                <Link href="/shop" className={styles.panelLink}>New Order</Link>
              </div>
              <div className={styles.emptyState}>
                <p>You haven&apos;t placed any orders yet.</p>
                <Link href="/shop" className="btn btn-outline" style={{ marginTop: "16px" }}>
                  Explore Shop
                </Link>
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Bespoke Appointments</h2>
                <Link href="/bespoke" className={styles.panelLink}>Book Slot</Link>
              </div>
              <div className={styles.emptyState}>
                <p>No upcoming appointments.</p>
                <Link href="/bespoke" className="btn btn-primary" style={{ marginTop: "16px" }}>
                  Book Consultation
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className="container">
          <span className="section-label">Your Account</span>
          <h1 className={styles.pageTitle}>{mode === "signin" ? "Sign In" : "Sign Up"}</h1>
        </div>
      </div>

      <div className="container" style={{ position: "relative" }}>
        <div className={styles.authWrap}>
          <div className={styles.authTabs}>
            <button
              className={`${styles.authTab} ${mode === "signin" ? styles.authTabActive : ""}`}
              onClick={() => setMode("signin")}
            >
              Sign In
            </button>
            <button
              className={`${styles.authTab} ${mode === "signup" ? styles.authTabActive : ""}`}
              onClick={() => setMode("signup")}
            >
              Sign Up
            </button>
          </div>

            <form className={styles.authForm} onSubmit={(e) => {
              e.preventDefault();
              
              // Intelligent Multi-field Validation
              const missingFields = [];
              if (mode === "signup" && !name) missingFields.push("name");
              if (!email) missingFields.push("email");
              if (!password) missingFields.push("password");

              if (missingFields.length > 0) {
                return;
              }

              authStore.signIn(name || email.split("@")[0], email);
            }}>
              {mode === "signup" && (
                <div className="form-group">
                  <label className="form-label" htmlFor="name">Full Name</label>
                  <input id="name" type="text" className="form-input" placeholder="Your full name"
                    value={name} onChange={(e) => setName(e.target.value)} 
                    required />
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="email">Email</label>
                <input id="email" type="email" className="form-input" placeholder="your@email.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} 
                  required />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">Password</label>
                <input id="password" type="password" className="form-input" placeholder="Enter password"
                  value={password} onChange={(e) => setPassword(e.target.value)} 
                  required />
              </div>

              <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%", justifyContent: "center", marginTop: "var(--space-md)" }}>
                {mode === "signin" ? "Sign In" : "Create Account"}
              </button>
            </form>
        </div>

      </div>
    </div>
  );
}
