"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { authStore } from "@/store/authStore";
import { toast } from "sonner";
import styles from "./account.module.css";

/** Must match Supabase Auth `mailer_otp_length` (default 6; max 10). */
const DIGITS = 6;

type Props = {
  email: string;
  onBack: () => void;
};

export function SignupOTPDialog({ email, onBack }: Props) {
  const [digits, setDigits] = useState<string[]>(() => Array(DIGITS).fill(""));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => {
      setResendCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const code = digits.join("");

  const setDigitAt = useCallback((index: number, char: string) => {
    if (!/^\d?$/.test(char)) return;
    setDigits((prev) => {
      const next = [...prev];
      next[index] = char;
      return next;
    });
    if (char && index < DIGITS - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }, []);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v.length > 1) {
      const only = v.replace(/\D/g, "").slice(0, DIGITS);
      if (only.length === DIGITS) {
        setDigits(only.split(""));
        inputsRef.current[DIGITS - 1]?.focus();
      }
      return;
    }
    setDigitAt(index, v);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, DIGITS);
    if (!text) return;
    const next = [...digits];
    for (let i = 0; i < DIGITS; i++) {
      next[i] = text[i] ?? "";
    }
    setDigits(next);
    const last = Math.min(text.length, DIGITS) - 1;
    if (last >= 0) inputsRef.current[last]?.focus();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== DIGITS) {
      toast.error(`Enter the ${DIGITS}-digit code from your email.`);
      return;
    }
    setIsVerifying(true);
    try {
      await authStore.verifySignupOTP(email, code);
      toast.success("You’re signed in.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Invalid code. Try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await authStore.resendSignupOTP(email);
      toast.success("We sent a new code to your email.");
      setResendCooldown(60);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not resend. Try again later.");
    }
  };

  return (
    <div className={styles.otpWrap}>
      <p className={styles.otpLead}>
        We sent a <strong>{DIGITS}-digit code</strong> to <span className={styles.otpEmail}>{email}</span>.
        Enter it below to verify your account.
      </p>

      <form onSubmit={handleVerify} className={styles.otpForm}>
        <div className={styles.otpDigits} onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              className={styles.otpDigit}
              value={d}
              onChange={(e) => handleChange(i, e)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              aria-label={`Digit ${i + 1}`}
            />
          ))}
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-lg"
          style={{ width: "100%", justifyContent: "center", marginTop: "var(--space-lg)" }}
          disabled={isVerifying || code.length !== DIGITS}
        >
          {isVerifying ? "Verifying…" : "Verify & continue"}
        </button>
      </form>

      <p className={styles.otpResend}>
        Didn’t get it?{" "}
        <button
          type="button"
          className={styles.otpResendBtn}
          onClick={handleResend}
          disabled={resendCooldown > 0}
        >
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
        </button>
      </p>

      <button type="button" className={styles.otpBack} onClick={onBack}>
        ← Back to sign up
      </button>
    </div>
  );
}
