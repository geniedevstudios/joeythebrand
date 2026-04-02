"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./LoginClient.module.css";

export default function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    // Mock API call to send OTP
    setTimeout(() => {
      setStatus("idle");
      setStep("otp");
    }, 1000);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) return;

    setStatus("loading");
    // Mock API verify OTP
    setTimeout(() => {
      setStatus("idle");
      // Simulate successful login, navigate to account dashboard
      router.push("/account");
    }, 1000);
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        
        {/* Decorative Brand Element */}
        <div className={styles.brandMark}>
          <h2>J <span className={styles.dot}>.</span></h2>
        </div>

        <div className={styles.card}>
          <h1 className={`t-heading ${styles.title}`}>
            {step === "email" ? "Client Access" : "Verify Access"}
          </h1>
          <p className={styles.subtitle}>
            {step === "email" 
              ? "Enter your email to receive a secure, passwordless sign-in link."
              : `Enter the code sent to ${email}`}
          </p>

          {step === "email" ? (
            <form onSubmit={handleEmailSubmit} className={styles.form} noValidate>
              <div className="form-group">
                <label htmlFor="email" className="form-label visually-hidden">Email Address</label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: "100%", justifyContent: "center" }}
                disabled={status === "loading" || !email}
              >
                {status === "loading" ? "Sending..." : "Continue"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className={styles.form} noValidate>
              <div className="form-group">
                <label htmlFor="otp" className="form-label visually-hidden">Verification Code</label>
                <input
                  id="otp"
                  type="text"
                  className={`form-input ${styles.otpInput}`}
                  placeholder="000 000"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // Numeric only
                  required
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: "100%", justifyContent: "center" }}
                disabled={status === "loading" || otp.length < 6}
              >
                {status === "loading" ? "Verifying..." : "Verify & Sign In"}
              </button>
              
              <button 
                type="button" 
                className={styles.backBtn}
                onClick={() => setStep("email")}
              >
                Use a different email
              </button>
            </form>
          )}

          <div className={styles.footer}>
            <p>Don't have an account? <Link href="/contact" className={styles.link}>Contact us for bespoke access.</Link></p>
          </div>
        </div>

      </div>
    </div>
  );
}
