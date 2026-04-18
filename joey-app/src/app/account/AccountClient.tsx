"use client";
import { useState, useSyncExternalStore, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { authStore } from "@/store/authStore";
import { dataStore } from "@/lib/dataStore";
import { supabase } from "@/lib/supabase";
import type { Order, OrderItem, ConsultationBooking } from "@/lib/types";
import { formatOrderNumber } from "@/lib/formatOrderNumber";
import { openConsultationPrintWindow } from "@/lib/printConsultation";
import { formatConsultationAppointmentLocal } from "@/lib/formatConsultationAppointment";
import styles from "./account.module.css";
import PageHeroShellImageLoader from "@/components/page-hero/PageHeroShellImageLoader";
import { PAGE_HERO_SHELL_CLASS, usePageHeroShellRenderProps } from "@/hooks/usePageHero";
import { SignupOTPDialog } from "./SignupOTPDialog";

type Mode = "signin" | "signup";

function statusLabel(status: Order["status"]) {
  const map: Record<Order["status"], string> = {
    pending: "Pending",
    processing: "Processing",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };
  return map[status];
}

function consultationStatusLabel(status: ConsultationBooking["status"]) {
  const map: Record<ConsultationBooking["status"], string> = {
    pending: "Pending review",
    confirmed: "Confirmed",
    declined: "Declined",
  };
  return map[status];
}

function formatPreferredDate(iso?: string) {
  if (!iso?.trim()) return null;
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" });
}

function OrderLineRow({ line }: { line: OrderItem }) {
  const size = line.size?.trim() || "—";
  const qty = typeof line.quantity === "number" && line.quantity > 0 ? line.quantity : 1;
  const lineTotal = line.price * qty;
  const href = `/shop/${line.productId}`;

  return (
    <li className={styles.orderLine}>
      <Link href={href} className={styles.orderLineLink}>
        <img
          src={line.image}
          alt=""
          className={styles.orderLineImg}
          width={48}
          height={62}
        />
        <span className={styles.orderLineBody}>
          <span className={styles.orderLineName}>{line.name || "Product"}</span>
          <span className={styles.orderLineMeta}>
            Size <strong>{size}</strong>
            <span aria-hidden> · </span>
            Qty <strong>{qty}</strong>
            <span aria-hidden> · </span>
            GHC {line.price.toLocaleString()} each
          </span>
        </span>
      </Link>
      <span className={styles.orderLinePrice}>GHC {lineTotal.toLocaleString()}</span>
    </li>
  );
}

function AccountDashboard({ userId }: { userId: string }) {
  const user = useSyncExternalStore(authStore.subscribe, authStore.getUser, () => null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [consultations, setConsultations] = useState<ConsultationBooking[]>([]);
  const [consultationsLoading, setConsultationsLoading] = useState(true);
  const [consultationsError, setConsultationsError] = useState("");
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

  const loadOrders = useCallback(async () => {
    try {
      const list = await dataStore.getOrdersForUser(userId);
      setOrders(list);
      setOrdersError("");
    } catch {
      setOrders([]);
      setOrdersError("Could not load orders. If this persists, confirm Supabase order policies are applied.");
    } finally {
      setOrdersLoading(false);
    }
  }, [userId]);

  const loadConsultations = useCallback(async () => {
    try {
      const list = await dataStore.getConsultationBookingsForUser(userId);
      setConsultations(list);
      setConsultationsError("");
    } catch {
      setConsultations([]);
      setConsultationsError(
        "Could not load bespoke appointments. Run the consultation_bookings SQL in Supabase and check RLS.",
      );
    } finally {
      setConsultationsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setOrdersLoading(true);
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    setConsultationsLoading(true);
    void loadConsultations();
  }, [loadConsultations]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel(`account-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          if (t) clearTimeout(t);
          t = setTimeout(() => {
            t = undefined;
            void loadOrders();
          }, 120);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "consultation_bookings" },
        () => {
          if (t) clearTimeout(t);
          t = setTimeout(() => {
            t = undefined;
            void loadConsultations();
          }, 120);
        },
      )
      .subscribe();
    return () => {
      if (t) clearTimeout(t);
      void supabase.removeChannel(channel);
    };
  }, [userId, loadOrders, loadConsultations]);

  useEffect(() => {
    if (!avatarMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAvatarMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [avatarMenuOpen]);

  const initials = authStore.getInitials();
  const {
    empty: accountHeroEmpty,
    shellSpinner: accountHeroSpinner,
    style: accountHeroStyle,
    showImageLoader: accountHeroImageLoader,
  } = usePageHeroShellRenderProps("account");

  return (
    <div className={styles.page}>
      <div
        className={`${PAGE_HERO_SHELL_CLASS} ${styles.pageHeader}`}
        data-page-hero-empty={accountHeroEmpty ? "true" : "false"}
        data-page-hero-loading={accountHeroSpinner ? "true" : "false"}
        style={accountHeroStyle}
      >
        {accountHeroImageLoader ? <PageHeroShellImageLoader /> : null}
        <div className="container">
          <span className="section-label">Welcome back</span>
          <h1 className={styles.pageTitle}>{user?.name}</h1>
          <p className={styles.email}>{user?.email}</p>
        </div>
      </div>

      <div className="container">
        <div className={styles.profileHeader}>
          <div className={styles.avatarContainer} ref={avatarMenuRef}>
            <button
              type="button"
              className={styles.profileAvatar}
              onClick={() => setAvatarMenuOpen((o) => !o)}
              aria-expanded={avatarMenuOpen}
              aria-haspopup="menu"
              aria-label="Open account menu"
            >
              {initials}
            </button>
            {avatarMenuOpen && (
              <div className={styles.avatarDropdown} role="menu">
                <Link
                  href="/contact"
                  className={styles.dropdownItem}
                  role="menuitem"
                  onClick={() => setAvatarMenuOpen(false)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>Report issue</span>
                </Link>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  role="menuitem"
                  onClick={async () => {
                    setAvatarMenuOpen(false);
                    await authStore.signOut();
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>Sign out</span>
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
            <div className={styles.panelBody}>
              {ordersLoading ? (
                <div className={styles.emptyState}>
                  <p>Loading orders…</p>
                </div>
              ) : ordersError ? (
                <div className={styles.emptyState}>
                  <p>{ordersError}</p>
                </div>
              ) : orders.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>You haven&apos;t placed any orders while signed in yet.</p>
                  <p style={{ fontSize: "0.85rem", color: "var(--cinereous)", marginTop: 8 }}>
                    Sign in before checkout to link orders to this account.
                  </p>
                  <Link href="/shop" className="btn btn-outline" style={{ marginTop: "16px" }}>
                    Explore Shop
                  </Link>
                </div>
              ) : (
                <div className={styles.panelScroll}>
                  <ul className={styles.ordersList}>
                    {orders.map((o) => (
                      <li key={o.id} className={styles.orderCard}>
                        <div className={styles.orderCardTop}>
                          <div>
                            <span className={styles.orderRef}>Order {formatOrderNumber(o)}</span>
                            <span className={styles.orderPlacedDate}>
                              {new Date(o.createdAt).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            <p className={styles.orderTotal}>GHC {o.total.toLocaleString()}</p>
                            <p className={styles.orderMeta}>
                              {o.items.length} line{o.items.length !== 1 ? "s" : ""}
                              {o.discount > 0 && o.promotionCode
                                ? ` · −GHC ${o.discount.toLocaleString()} (${o.promotionCode})`
                                : ""}
                            </p>
                          </div>
                          <span className={styles.orderStatus}>{statusLabel(o.status)}</span>
                        </div>
                        {o.items && o.items.length > 0 ? (
                          <ul className={styles.orderLines}>
                            {o.items.map((line, idx) => (
                              <OrderLineRow
                                key={`${o.id}-${idx}-${line.productId}-${line.size ?? ""}`}
                                line={line}
                              />
                            ))}
                          </ul>
                        ) : (
                          <p className={styles.orderLinesEmpty}>No products listed for this order.</p>
                        )}
                        {o.notes?.trim() ? (
                          <p className={styles.orderNotes}>
                            <span className={styles.orderNotesLabel}>Your note</span>
                            {o.notes.trim()}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Bespoke Appointments</h2>
              <Link href="/bespoke" className={styles.panelLink}>Book Slot</Link>
            </div>
            <div className={styles.panelBody}>
              {consultationsLoading ? (
                <div className={styles.emptyState}>
                  <p>Loading appointments…</p>
                </div>
              ) : consultationsError ? (
                <div className={styles.emptyState}>
                  <p>{consultationsError}</p>
                </div>
              ) : consultations.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No bespoke requests yet.</p>
                  <p style={{ fontSize: "0.85rem", color: "var(--cinereous)", marginTop: 8 }}>
                    Book a slot while signed in — we&apos;ll show status and your booking code here after approval.
                  </p>
                  <Link href="/bespoke" className="btn btn-primary" style={{ marginTop: "16px" }}>
                    Book Consultation
                  </Link>
                </div>
              ) : (
                <div className={styles.panelScroll}>
                  <ul className={styles.consultationsList}>
                    {consultations.map((c) => {
                      const pref = formatPreferredDate(c.preferredDate);
                      return (
                        <li key={c.id} className={styles.orderCard}>
                          <div className={styles.orderCardTop}>
                            <div>
                              <span className={styles.orderRef}>{c.service}</span>
                              <span className={styles.orderPlacedDate}>
                                Requested{" "}
                                {new Date(c.createdAt).toLocaleDateString(undefined, {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                            <span className={styles.orderStatus}>{consultationStatusLabel(c.status)}</span>
                          </div>
                          <div className={styles.consultationBody}>
                            <p>
                              <strong>{c.customerName}</strong>
                              <span aria-hidden> · </span>
                              {c.customerEmail}
                              <span aria-hidden> · </span>
                              {c.customerPhone}
                            </p>
                            {pref ? <p>Preferred date: {pref}</p> : null}
                            {c.notes?.trim() ? (
                              <p>
                                <span style={{ color: "var(--cinereous)" }}>Your note: </span>
                                {c.notes.trim()}
                              </p>
                            ) : null}
                            {c.status === "confirmed" && c.bookingCode ? (
                              <div className={styles.bookingCodeBlock}>
                                <span className={styles.bookingCodeLabel}>Your booking code</span>
                                <div className={styles.bookingCodeRow}>
                                  <span className={styles.bookingCode}>{c.bookingCode}</span>
                                  <button
                                    type="button"
                                    className={`btn btn-outline ${styles.printConsultBtn}`}
                                    onClick={() => openConsultationPrintWindow(c)}
                                  >
                                    <svg
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      aria-hidden
                                    >
                                      <polyline points="6 9 6 2 18 2 18 9" />
                                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                      <rect x="6" y="14" width="12" height="8" />
                                    </svg>
                                    Print / PDF
                                  </button>
                                </div>
                                <p className={styles.bookingCodeHint}>
                                  Save or print this slip to bring to your appointment for quick confirmation.
                                </p>
                              </div>
                            ) : null}
                            {c.status === "confirmed" && c.scheduledAt ? (
                              <p style={{ marginTop: "var(--space-sm)" }}>
                                <span style={{ color: "var(--cinereous)" }}>Appointment time: </span>
                                {formatConsultationAppointmentLocal(c.scheduledAt)}
                              </p>
                            ) : null}
                            {c.status === "pending" ? (
                              <p style={{ fontSize: "0.85rem", color: "var(--cinereous)" }}>
                                We&apos;ll confirm or decline within 24–48 hours. You can check back here anytime.
                              </p>
                            ) : null}
                            {c.status === "declined" ? (
                              <p style={{ fontSize: "0.85rem", color: "var(--cinereous)" }}>
                                This slot could not be confirmed. Please pick another date on{" "}
                                <Link href="/bespoke" className={styles.panelLink}>Book a slot</Link>
                                {" "}or reach us on WhatsApp.
                              </p>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AccountClient() {
  const user = useSyncExternalStore(authStore.subscribe, authStore.getUser, () => null);
  const {
    empty: accountHeroEmpty,
    shellSpinner: accountHeroSpinner,
    style: accountHeroStyle,
    showImageLoader: accountHeroImageLoader,
  } = usePageHeroShellRenderProps("account");
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  /** After sign-up, if Supabase requires email confirmation, collect OTP here. */
  const [pendingSignupEmail, setPendingSignupEmail] = useState<string | null>(null);

  if (user) {
    return <AccountDashboard userId={user.id} />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPendingSignupEmail(null);
    setIsLoading(true);

    try {
      if (mode === "signup") {
        if (!name || !email || !password) {
          setError("Please fill in all fields.");
          setIsLoading(false);
          return;
        }
        const { needsEmailVerification } = await authStore.signUp(name, email, password);
        if (needsEmailVerification) {
          setPendingSignupEmail(email.trim());
        }
        /* If confirmation is disabled in Supabase, session exists and onAuthStateChange signs the user in. */
      } else {
        if (!email || !password) {
          setError("Please enter your email and password.");
          setIsLoading(false);
          return;
        }
        await authStore.signIn(email, password);
        // onAuthStateChange will update the user, page re-renders automatically
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Try again.";
      setError(msg);
      if (err instanceof Error && err.name === "DuplicateSignupEmail") {
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div
        className={`${PAGE_HERO_SHELL_CLASS} ${styles.pageHeader}`}
        data-page-hero-empty={accountHeroEmpty ? "true" : "false"}
        data-page-hero-loading={accountHeroSpinner ? "true" : "false"}
        style={accountHeroStyle}
      >
        {accountHeroImageLoader ? <PageHeroShellImageLoader /> : null}
        <div className="container">
          <span className="section-label">Your Account</span>
          <h1 className={styles.pageTitle}>
            {pendingSignupEmail ? "Verify email" : mode === "signin" ? "Sign In" : "Sign Up"}
          </h1>
        </div>
      </div>

      <div className="container" style={{ position: "relative" }}>
        <div className={styles.authWrap}>
          {!pendingSignupEmail ? (
            <>
              <div className={styles.authTabs}>
                <button
                  type="button"
                  className={`${styles.authTab} ${mode === "signin" ? styles.authTabActive : ""}`}
                  onClick={() => { setMode("signin"); setError(""); setPendingSignupEmail(null); }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`${styles.authTab} ${mode === "signup" ? styles.authTabActive : ""}`}
                  onClick={() => { setMode("signup"); setError(""); setPendingSignupEmail(null); }}
                >
                  Sign Up
                </button>
              </div>

              <form className={styles.authForm} onSubmit={handleSubmit}>
                {mode === "signup" && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="name">Full Name</label>
                    <input id="name" type="text" className="form-input" placeholder="Your full name"
                      value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="email">Email</label>
                  <input id="email" type="email" className="form-input" placeholder="your@email.com"
                    value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="password">Password</label>
                  <input id="password" type="password" className="form-input" placeholder="Enter password"
                    value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>

                {error && (
                  <p style={{ color: "var(--error, #c00)", fontSize: "0.85rem", marginTop: "-8px" }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{ width: "100%", justifyContent: "center", marginTop: "var(--space-md)" }}
                  disabled={isLoading}
                >
                  {isLoading
                    ? mode === "signin" ? "Signing in..." : "Creating account..."
                    : mode === "signin" ? "Sign In" : "Create Account"}
                </button>
                {mode === "signup" && (
                  <p className={styles.signupPrivacy}>
                    Read our{" "}
                    <Link href="/privacy">Privacy Policy</Link> to see how we use your information.
                  </p>
                )}
              </form>
            </>
          ) : (
            <SignupOTPDialog
              email={pendingSignupEmail}
              onBack={() => {
                setPendingSignupEmail(null);
                setError("");
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
