"use client";
import {
  useState,
  useSyncExternalStore,
  useEffect,
  useRef,
  useCallback,
} from "react";
import ProductMedia from "@/components/shop/ProductMedia";

// ── Rotating flavour text ────────────────────────────────────────────────────
const FORGOT_PHRASES = [
  "mmm you're a clumsy one.",
  "happens to the best of us.",
  "we all forget sometimes.",
  "no judgement here, seriously.",
  "your secret's safe with us.",
];
const OTP_PHRASES = [
  "check your inbox — it's in there.",
  "we just slid into your inbox.",
  "quick, before it expires.",
  "your email's got something for you.",
  "one code, one chance, let's go.",
];
const NEW_PASS_PHRASES = [
  "make it a good one this time.",
  "something you'll actually remember.",
  "no 'password123' please.",
  "strong and memorable — you've got this.",
  "this one's on you now.",
];
const SUCCESS_PHRASES = [
  "all set, don't forget this one too.",
  "locked and loaded. we believe in you.",
  "saved. now remember it this time.",
  "you're back. don't make this a habit.",
  "password updated. legendary.",
];
function randomPhrase(phrases: string[]) {
  return phrases[Math.floor(Math.random() * phrases.length)];
}

// ── OTP digit input ──────────────────────────────────────────────────────────
const RESET_DIGITS = 6;
function ResetOTPInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => {
    refs.current[0]?.focus();
  }, []);
  const setAt = useCallback(
    (i: number, ch: string) => {
      if (!/^\d?$/.test(ch)) return;
      const next = [...value];
      next[i] = ch;
      onChange(next);
      if (ch && i < RESET_DIGITS - 1) refs.current[i + 1]?.focus();
    },
    [value, onChange],
  );
  const handleChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v.length > 1) {
      const only = v.replace(/\D/g, "").slice(0, RESET_DIGITS);
      if (only.length === RESET_DIGITS) {
        onChange(only.split(""));
        refs.current[RESET_DIGITS - 1]?.focus();
      }
      return;
    }
    setAt(i, v);
  };
  const handleKeyDown = (
    i: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !value[i] && i > 0)
      refs.current[i - 1]?.focus();
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, RESET_DIGITS);
    if (!text) return;
    const next = Array(RESET_DIGITS).fill("");
    for (let i = 0; i < RESET_DIGITS; i++) next[i] = text[i] ?? "";
    onChange(next);
    const last = Math.min(text.length, RESET_DIGITS) - 1;
    if (last >= 0) refs.current[last]?.focus();
  };
  return (
    <div className={styles.otpDigits} onPaste={handlePaste}>
      {value.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
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
  );
}
import Link from "next/link";
import { toast } from "sonner";
import { authStore } from "@/store/authStore";
import { dataStore } from "@/lib/dataStore";
import { supabase } from "@/lib/supabase";
import type { Order, OrderItem, ConsultationBooking } from "@/lib/types";
import { formatOrderNumber } from "@/lib/formatOrderNumber";
import { openConsultationPrintWindow } from "@/lib/printConsultation";
import { formatConsultationAppointmentLocal } from "@/lib/formatConsultationAppointment";
import { formatPhoneDisplay } from "@/lib/formatPhoneDisplay";
import { formatSizeLabel } from "@/lib/formatSizeLabel";
import styles from "./account.module.css";
import PageHeroShellImageLoader from "@/components/page-hero/PageHeroShellImageLoader";
import {
  PAGE_HERO_SHELL_CLASS,
  usePageHeroShellRenderProps,
} from "@/hooks/usePageHero";
import { SignupOTPDialog } from "./SignupOTPDialog";

type Mode = "signin" | "signup" | "forgot" | "otp" | "newpass" | "success";

function statusLabel(status: Order["status"]) {
  const map: Record<Order["status"], string> = {
    pending: "Pending",
    processing: "Processing",
    "order packaged": "Order Packaged",
    "courier on his way to pick package": "Courier on his way to pick package",
    "courier picked package": "Courier picked package",
    "courier on the way to deliver package":
      "Courier on the way to deliver package",
    "package delivered": "Package Delivered",
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

function formatPreferredSlot(dateIso?: string, time24?: string) {
  if (!dateIso?.trim()) return null;
  const d = new Date(dateIso.length === 10 ? `${dateIso}T12:00:00` : dateIso);
  const dateLabel = Number.isNaN(d.getTime())
    ? dateIso
    : d.toLocaleDateString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
  if (!time24?.trim()) return dateLabel;
  const time = time24.trim();
  const m = /^(\d{2}):(\d{2})$/.exec(time);
  if (!m) return `${dateLabel} • ${time}`;
  const h = Number(m[1]);
  const mm = m[2];
  const hour12 = ((h + 11) % 12) + 1;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${dateLabel} • ${hour12}:${mm} ${ampm}`;
}

function OrderLineRow({ line }: { line: OrderItem }) {
  const size = line.size?.trim() || "—";
  const qty =
    typeof line.quantity === "number" && line.quantity > 0 ? line.quantity : 1;
  const lineTotal = line.price * qty;
  const href = `/shop/${line.productId}`;

  return (
    <li className={styles.orderLine}>
      <Link href={href} className={styles.orderLineLink}>
        <ProductMedia src={line.image} alt="" className={styles.orderLineImg} />
        <span className={styles.orderLineBody}>
          <span className={styles.orderLineName}>{line.name || "Product"}</span>
          {(line.color || line.combo) && (
            <span
              className={styles.orderLineMeta}
              style={{ marginTop: "2px", textTransform: "capitalize" }}
            >
              {(line.color || line.colorHex) && (
                <span
                  style={{
                    marginRight: "8px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  Color:{" "}
                  {line.colorHex ? (
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        backgroundColor: line.colorHex || "#ccc", backgroundImage: line.image ? `url(${line.image})` : "none", backgroundSize: "cover", backgroundPosition: "center",
                        border: "1px solid #ccc",
                        display: "inline-block",
                      }}
                      title={line.color}
                    />
                  ) : (
                    line.color
                  )}
                </span>
              )}
              {line.combo && <span>Combo: {line.combo}</span>}
            </span>
          )}
          <span className={styles.orderLineMeta}>
            Size{" "}
            <strong>{formatSizeLabel(size, line.fit, line.wearTag)}</strong>
            {line.fit && (
              <>
                <span aria-hidden> · </span>
                Fit <strong>{line.fit}</strong>
              </>
            )}
            <span aria-hidden> · </span>
            Qty <strong>{qty}</strong>
            <span aria-hidden> · </span>
            GHC {line.price.toLocaleString()} each
          </span>
        </span>
      </Link>
      <span className={styles.orderLinePrice}>
        GHC {lineTotal.toLocaleString()}
      </span>
    </li>
  );
}

function formatEventDateTime(dateStr: string, timeStr?: string) {
  if (!dateStr) return "";
  let d: Date;
  if (dateStr.includes("T")) {
    d = new Date(dateStr);
  } else {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      d = new Date(
        parseInt(parts[0], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[2], 10),
      );
    } else {
      d = new Date(dateStr);
    }
  }

  if (isNaN(d.getTime())) return dateStr.trim();

  const monthNames = [
    "june",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];
  monthNames[0] = "january";
  const month = monthNames[d.getMonth()];

  const date = d.getDate();
  const suffix =
    date === 1 || date === 21 || date === 31
      ? "st"
      : date === 2 || date === 22
        ? "nd"
        : date === 3 || date === 23
          ? "rd"
          : "th";
  const year = d.getFullYear();

  return `${month} ${date}${suffix}, ${year}`;
}

function OrderTracking({
  trackingNumber,
  dhlStatus,
  createdAt,
  updatedAt,
}: {
  trackingNumber: string;
  dhlStatus?: string;
  createdAt: string;
  updatedAt: string;
}) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const fetchTracking = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/shipping/track?trackingNumber=${trackingNumber}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch tracking");

        if (isMounted) {
          const shipment = data.shipments?.[0];
          if (shipment?.events && shipment.events.length > 0) {
            setEvents(shipment.events);
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTracking();
    return () => {
      isMounted = false;
    };
  }, [trackingNumber]);

  const localEvents: any[] = [];
  try {
    const createdDate = new Date(createdAt);
    const updatedDate = new Date(updatedAt || createdAt);

    localEvents.push({
      date: createdDate.toISOString().split("T")[0],
      time: createdDate.toISOString().split("T")[1].substring(0, 5),
      description: "Order received",
    });

    if (
      dhlStatus === "Manifested" ||
      dhlStatus?.startsWith("Pickup Scheduled")
    ) {
      const eventDate = dhlStatus === "Manifested" ? updatedDate : createdDate;
      localEvents.push({
        date: eventDate.toISOString().split("T")[0],
        time: eventDate.toISOString().split("T")[1].substring(0, 5),
        description: "Ready to be packed",
      });
    }

    if (dhlStatus?.startsWith("Pickup Scheduled")) {
      localEvents.push({
        date: updatedDate.toISOString().split("T")[0],
        time: updatedDate.toISOString().split("T")[1].substring(0, 5),
        description: "Order packed and awaiting courier",
      });
    }
  } catch (e) {}

  const allEvents = [...localEvents, ...events];

  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        backgroundColor: "var(--light-bg)",
        borderRadius: 6,
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <span style={{ fontSize: "0.85rem", color: "var(--cinereous)" }}>
            DHL Express Tracking
          </span>
          <div
            style={{
              fontWeight: 600,
              letterSpacing: "1px",
              fontSize: "0.9rem",
            }}
          >
            {trackingNumber}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <a
            href={`https://www.dhl.com/gh-en/home/tracking/tracking-express.html?submit=1&tracking-id=${trackingNumber}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline"
            style={{
              padding: "4px 8px",
              fontSize: "0.8rem",
              height: "auto",
              minHeight: 0,
            }}
          >
            Track on DHL
          </a>
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          borderTop: "1px solid var(--border)",
          paddingTop: 16,
        }}
      >
        {loading && (
          <p style={{ fontSize: "0.85rem", color: "var(--cinereous)" }}>
            Loading tracking events...
          </p>
        )}
        {error && (
          <p style={{ fontSize: "0.85rem", color: "var(--error)" }}>{error}</p>
        )}
        {!loading && !error && allEvents.length > 0 && (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {allEvents.map((ev, i) => (
              <li
                key={i}
                style={
                  {
                    display: "flex",
                    gap: 12,
                    fontSize: "0.85rem",
                    flexDirection: "column",
                    sm: { flexDirection: "row" },
                  } as any
                }
              >
                <div
                  style={{
                    color: "var(--cinereous)",
                    flexShrink: 0,
                    minWidth: "160px",
                  }}
                >
                  {formatEventDateTime(ev.date, ev.time)}
                </div>
                <div>
                  <strong>{ev.description}</strong>
                  {ev.serviceArea?.[0]?.description && (
                    <span
                      style={{
                        display: "block",
                        color: "var(--cinereous)",
                        marginTop: 2,
                      }}
                    >
                      {ev.serviceArea[0].description}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DomesticOrderTracking({
  history,
  createdAt,
}: {
  history: { status: string; timestamp: string }[];
  createdAt: string;
}) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);
  const events = [{ status: "pending", timestamp: createdAt }, ...history].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const DOMESTIC_SEQUENCE = [
    "pending",
    "processing",
    "order packaged",
    "courier picked package",
    "courier on the way to deliver package",
    "package delivered",
  ];

  const getStepInfo = (status: string) => {
    switch (status) {
      case "pending":
        return {
          title: "Order Placed",
          desc: "We have received your order",
          icon: (
            <img
              src="/icons/clipboard.png"
              alt="Order Placed"
              style={{ width: 24, height: 24, opacity: 0.8 }}
            />
          ),
        };
      case "processing":
        return {
          title: "Processing",
          desc: "We are preparing your order",
          icon: (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          ),
        };
      case "order packaged":
        return {
          title: "Packaged",
          desc: "Your order is packed and ready",
          icon: (
            <img
              src="/icons/box.png"
              alt="Packaged"
              style={{ width: 24, height: 24, opacity: 0.8 }}
            />
          ),
        };
      case "courier on his way to pick package":
        return {
          title: "Courier on his way to pick package",
          desc: "Courier is en route to pick up your package",
          icon: (
            <img
              src="/icons/outfordelivery.png"
              alt="Courier on his way"
              style={{ width: 24, height: 24, opacity: 0.8 }}
            />
          ),
        };
      case "courier picked package":
        return {
          title: "Package Picked Up",
          desc: "Courier has picked up the package",
          icon: (
            <img
              src="/icons/picked.png"
              alt="Package picked up"
              style={{ width: 24, height: 24, opacity: 0.8 }}
            />
          ),
        };
      case "courier on the way to deliver package":
        return {
          title: "Out for Delivery",
          desc: "Courier is on the way",
          icon: (
            <img
              src="/icons/outfordelivery.png"
              alt="Delivery Icon"
              style={{ width: 24, height: 24, opacity: 0.8, transform: "scaleX(-1)" }}
            />
          ),
        };
      case "package delivered":
        return {
          title: "Delivered",
          desc: "Package has been delivered",
          icon: (
            <img
              src="/icons/complete.png"
              alt="Package delivered"
              style={{ width: 24, height: 24, opacity: 0.8 }}
            />
          ),
        };
      case "cancelled":
        return {
          title: "Cancelled",
          desc: "This order was cancelled",
          icon: (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          ),
        };
      default:
        return {
          title: statusLabel(status as any),
          desc: "",
          icon: (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
            </svg>
          ),
        };
    }
  };

  const completedStatuses = events.map((e) => e.status);
  const lastStatus = completedStatuses[completedStatuses.length - 1];
  const isCancelled = lastStatus === "cancelled";

  const timelineData: any[] = [];
  const handledStatuses = new Set<string>();

  events.forEach((e) => {
    const seqIdx = DOMESTIC_SEQUENCE.indexOf(e.status);
    if (seqIdx >= 0) {
      for (let i = 0; i < seqIdx; i++) {
        const skippedStatus = DOMESTIC_SEQUENCE[i];
        if (!handledStatuses.has(skippedStatus)) {
          timelineData.push({
            status: skippedStatus,
            timestamp: null,
            isCompleted: true,
            isCurrent: false,
          });
          handledStatuses.add(skippedStatus);
        }
      }
    }
    
    if (!handledStatuses.has(e.status)) {
      timelineData.push({
        status: e.status,
        timestamp: e.timestamp,
        isCompleted: true,
        isCurrent: e.status === lastStatus && !isCancelled && e.status !== "package delivered",
      });
      handledStatuses.add(e.status);
    }
  });

  if (!isCancelled && lastStatus !== "package delivered") {
    const lastIdx = DOMESTIC_SEQUENCE.indexOf(lastStatus);
    if (lastIdx >= 0) {
      for (let i = lastIdx + 1; i < DOMESTIC_SEQUENCE.length; i++) {
        if (!handledStatuses.has(DOMESTIC_SEQUENCE[i])) {
          timelineData.push({
            status: DOMESTIC_SEQUENCE[i],
            timestamp: null,
            isCompleted: false,
            isCurrent: false,
          });
          handledStatuses.add(DOMESTIC_SEQUENCE[i]);
        }
      }
    }
  }

  return (
    <div
      style={{
        marginTop: 24,
        padding: "24px",
        backgroundColor: "#fff",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 32,
        }}
      >
        <div>
          <span
            style={{
              fontSize: "0.85rem",
              color: "var(--cinereous)",
              textTransform: "uppercase",
              letterSpacing: "1px",
              fontWeight: 600,
            }}
          >
            Local Delivery Tracking
          </span>
          <div
            style={{
              fontWeight: 600,
              fontSize: "0.9rem",
              marginTop: 4,
              letterSpacing: "1px",
            }}
          >
            Order Timeline
          </div>
        </div>
      </div>

      {loading ? (
        <div
          style={{
            marginTop: 16,
            borderTop: "1px solid var(--border)",
            paddingTop: 16,
          }}
        >
          <p style={{ fontSize: "0.85rem", color: "var(--cinereous)" }}>
            Loading tracking events...
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {timelineData.map((item, i) => {
            const isLast = i === timelineData.length - 1;
            const info = getStepInfo(item.status);
            const color =
              item.isCompleted || item.isCurrent
                ? "var(--blue-athracite)"
                : "#cbd5e1";
            const bgColor =
              item.isCompleted || item.isCurrent
                ? "rgba(39, 43, 54, 0.05)"
                : "#f8fafc";
            const textColor =
              item.isCompleted || item.isCurrent
                ? "var(--blue-athracite)"
                : "#94a3b8";
            const descColor =
              item.isCompleted || item.isCurrent
                ? "var(--cinereous)"
                : "#cbd5e1";

            let dateStr = "";
            let timeStr = "";
            if (item.timestamp) {
              const formatted = formatEventDateTime(item.timestamp);
              const parts = formatted.split(" @ ");
              dateStr = parts[0];
              timeStr = parts[1] || "";
            }

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "20px",
                  position: "relative",
                  minHeight: isLast ? "60px" : "90px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    width: "56px",
                  }}
                >
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "16px",
                      backgroundColor: bgColor,
                      color: color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: item.isCurrent
                        ? "0 4px 12px rgba(39, 43, 54, 0.12)"
                        : "none",
                    }}
                  >
                    {info.icon}
                  </div>
                  {!isLast && (
                    <div
                      style={{
                        flex: 1,
                        width: "2px",
                        backgroundColor: color,
                        margin: "8px 0",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  )}
                </div>

                <div
                  style={{ flex: 1, paddingTop: "6px", paddingBottom: "24px" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "0.85rem",
                          color: textColor,
                          marginBottom: "6px",
                        }}
                      >
                        {info.title}
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: descColor,
                          fontWeight: 500,
                        }}
                      >
                        {info.desc}
                      </div>
                    </div>
                    <div
                      style={{
                        textAlign: "right",
                        color: textColor,
                        fontSize: "0.85rem",
                      }}
                    >
                      {dateStr && (
                        <div style={{ fontWeight: 500 }}>{dateStr}</div>
                      )}
                      {timeStr && (
                        <div style={{ marginTop: "4px" }}>{timeStr}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OrderTrackingButton({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (o: boolean) => void;
}) {
  return (
    <button
      onClick={() => setIsOpen(!isOpen)}
      className="btn btn-primary"
      style={{
        padding: "4px 12px",
        fontSize: "0.8rem",
        height: "auto",
        minHeight: 0,
      }}
    >
      {isOpen ? "Hide timeline" : "Show timeline"}
    </button>
  );
}

function OrderCard({
  o,
  isInternational,
}: {
  o: Order;
  isInternational: boolean;
}) {
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

  return (
    <li className={styles.orderCard}>
      <div className={styles.orderCardTop}>
        <div className={styles.orderInfo}>
          <span className={styles.orderRef}>Order {formatOrderNumber(o)}</span>
          <span className={styles.orderSeparator} aria-hidden>
            ·
          </span>
          <span className={styles.orderPlacedDate}>
            {new Date(o.createdAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
        <div className={styles.orderStats}>
          <span className={styles.orderTotal}>
            GHC {o.total.toLocaleString()}
          </span>
          {isInternational && o.dhlTrackingNumber ? (
            <OrderTrackingButton
              isOpen={isTimelineOpen}
              setIsOpen={setIsTimelineOpen}
            />
          ) : isInternational && !o.dhlTrackingNumber ? (
            <span
              className={styles.orderStatus}
              style={{ background: "#f0f0f0", color: "#666" }}
            >
              Awaiting Tracking
            </span>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                onClick={() => setIsTimelineOpen(!isTimelineOpen)}
                className="btn btn-outline"
                style={{
                  padding: "4px 12px",
                  fontSize: "0.8rem",
                  height: "auto",
                  minHeight: 0,
                }}
              >
                {isTimelineOpen ? "Hide order status" : "Order status"}
              </button>
            </div>
          )}
        </div>
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
        <p className={styles.orderLinesEmpty}>
          No products listed for this order.
        </p>
      )}
      {o.notes?.trim() ? (
        <p className={styles.orderNotes}>
          <span className={styles.orderNotesLabel}>Your note</span>
          {o.notes.trim()}
        </p>
      ) : null}

      {/* If timeline is open, render tracking block */}
      {isInternational && o.dhlTrackingNumber && isTimelineOpen && (
        <OrderTracking
          trackingNumber={o.dhlTrackingNumber}
          dhlStatus={o.dhlStatus}
          createdAt={o.createdAt}
          updatedAt={o.updatedAt}
        />
      )}
      {!isInternational && isTimelineOpen && (
        <DomesticOrderTracking
          history={o.statusHistory || []}
          createdAt={o.createdAt}
        />
      )}
    </li>
  );
}

function AccountDashboard({ userId }: { userId: string }) {
  const user = useSyncExternalStore(
    authStore.subscribe,
    authStore.getUser,
    () => null,
  );
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [consultations, setConsultations] = useState<ConsultationBooking[]>([]);
  const [consultationsLoading, setConsultationsLoading] = useState(true);
  const [consultationsError, setConsultationsError] = useState("");
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"orders" | "appointments">(
    "orders",
  );
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

  const loadOrders = useCallback(async () => {
    try {
      const list = await dataStore.getOrdersForUser(userId);
      setOrders(list);
      setOrdersError("");
    } catch {
      setOrders([]);
      setOrdersError(
        "Could not load orders. If this persists, confirm Supabase order policies are applied.",
      );
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
      if (
        avatarMenuRef.current &&
        !avatarMenuRef.current.contains(e.target as Node)
      ) {
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
        <div
          className={styles.profileHeader}
          style={{ position: "relative", justifyContent: "center" }}
        >
          <div className={styles.segmentedToggle}>
            <button
              onClick={() => setActiveTab("orders")}
              className={`${styles.segmentedBtn} ${activeTab === "orders" ? styles.segmentedBtnActive : ""}`}
            >
              Orders
            </button>
            <button
              onClick={() => setActiveTab("appointments")}
              className={`${styles.segmentedBtn} ${activeTab === "appointments" ? styles.segmentedBtnActive : ""}`}
            >
              Appointments
            </button>
          </div>

          <div
            className={styles.avatarContainer}
            ref={avatarMenuRef}
            style={{ position: "absolute", right: 0, margin: 0 }}
          >
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
                  href="/report-issue"
                  className={styles.dropdownItem}
                  role="menuitem"
                  onClick={() => setAvatarMenuOpen(false)}
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
                  >
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
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
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

        <div>
          {activeTab === "orders" && (
            <div style={{ marginTop: "16px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "24px",
                }}
              >
                <h2 style={{ fontSize: "1.2rem", fontWeight: 600, margin: 0 }}>
                  Recent Orders
                </h2>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "16px" }}
                >
                  <button
                    onClick={() => setHistoryModalOpen(true)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--cinereous)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                    aria-label="Order History"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                      History
                    </span>
                  </button>
                  <Link
                    href="/shop"
                    className="btn btn-outline"
                    style={{ padding: "6px 16px", fontSize: "0.85rem" }}
                  >
                    New Order
                  </Link>
                </div>
              </div>
              <div>
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
                    <p>
                      You haven&apos;t placed any orders while signed in yet.
                    </p>
                    <p
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--cinereous)",
                        marginTop: 8,
                      }}
                    >
                      Sign in before checkout to link orders to this account.
                    </p>
                    <Link
                      href="/shop"
                      className="btn btn-outline"
                      style={{ marginTop: "16px" }}
                    >
                      Explore Shop
                    </Link>
                  </div>
                ) : (
                  <div>
                    <ul
                      className={styles.ordersList}
                      style={{ margin: 0, padding: 0 }}
                    >
                      {orders
                        .filter(
                          (o) =>
                            o.status !== "package delivered" &&
                            o.status !== "cancelled",
                        )
                        .map((o) => {
                          const isInternational =
                            o.shippingAddress.includes("(international)");
                          return (
                            <OrderCard
                              key={o.id}
                              o={o}
                              isInternational={isInternational}
                            />
                          );
                        })}

                      {orders.filter(
                        (o) =>
                          o.status !== "package delivered" &&
                          o.status !== "cancelled",
                      ).length === 0 && (
                        <div
                          className={styles.emptyState}
                          style={{ marginTop: "32px", padding: "0 24px" }}
                        >
                          <p>No active orders found.</p>
                        </div>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "appointments" && (
            <div style={{ marginTop: "16px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "24px",
                }}
              >
                <h2 style={{ fontSize: "1.2rem", fontWeight: 600, margin: 0 }}>
                  Bespoke Appointments
                </h2>
                <Link
                  href="/bespoke"
                  className="btn btn-outline"
                  style={{ padding: "6px 16px", fontSize: "0.85rem" }}
                >
                  Book Slot
                </Link>
              </div>
              <div>
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
                    <p
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--cinereous)",
                        marginTop: 8,
                      }}
                    >
                      Book a slot while signed in — we&apos;ll show status and
                      your booking code here after approval.
                    </p>
                    <Link
                      href="/bespoke"
                      className="btn btn-primary"
                      style={{ marginTop: "16px" }}
                    >
                      Book Consultation
                    </Link>
                  </div>
                ) : (
                  <div>
                    <ul
                      className={styles.consultationsList}
                      style={{ margin: 0, padding: 0 }}
                    >
                      {consultations.map((c) => {
                        const pref = formatPreferredSlot(
                          c.preferredDate,
                          c.preferredTime,
                        );
                        return (
                          <li key={c.id} className={styles.orderCard}>
                            <div className={styles.orderCardTop}>
                              <div className={styles.orderInfo}>
                                <span className={styles.orderRef}>
                                  {c.service}
                                </span>
                                <span
                                  className={styles.orderSeparator}
                                  aria-hidden
                                >
                                  ·
                                </span>
                                <span className={styles.orderPlacedDate}>
                                  Requested{" "}
                                  {new Date(c.createdAt).toLocaleDateString(
                                    undefined,
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    },
                                  )}
                                </span>
                              </div>
                              <span className={styles.orderStatus}>
                                {consultationStatusLabel(c.status)}
                              </span>
                            </div>
                            <div className={styles.consultationBody}>
                              <p>
                                <strong>{c.customerName}</strong>
                                <span aria-hidden> · </span>
                                {c.customerEmail}
                                <span aria-hidden> · </span>
                                {formatPhoneDisplay(c.customerPhone)}
                              </p>
                              {pref ? <p>Preferred slot: {pref}</p> : null}
                              {c.notes?.trim() ? (
                                <p>
                                  <span style={{ color: "var(--cinereous)" }}>
                                    Your note:{" "}
                                  </span>
                                  {c.notes.trim()}
                                </p>
                              ) : null}
                              {c.status === "confirmed" && c.bookingCode ? (
                                <div className={styles.bookingCodeBlock}>
                                  <span className={styles.bookingCodeLabel}>
                                    Your booking code
                                  </span>
                                  <div className={styles.bookingCodeRow}>
                                    <span className={styles.bookingCode}>
                                      {c.bookingCode}
                                    </span>
                                    <button
                                      type="button"
                                      className={`btn btn-outline ${styles.printConsultBtn}`}
                                      onClick={() =>
                                        openConsultationPrintWindow(c)
                                      }
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
                                        <rect
                                          x="6"
                                          y="14"
                                          width="12"
                                          height="8"
                                        />
                                      </svg>
                                      Print / PDF
                                    </button>
                                  </div>
                                  <p className={styles.bookingCodeHint}>
                                    Save or print this slip to bring to your
                                    appointment for quick confirmation.
                                  </p>
                                </div>
                              ) : null}
                              {c.status === "confirmed" && c.scheduledAt ? (
                                <p style={{ marginTop: "var(--space-sm)" }}>
                                  <span style={{ color: "var(--cinereous)" }}>
                                    Appointment time:{" "}
                                  </span>
                                  {formatConsultationAppointmentLocal(
                                    c.scheduledAt,
                                  )}
                                </p>
                              ) : null}
                              {c.status === "pending" ? (
                                <p
                                  style={{
                                    fontSize: "0.85rem",
                                    color: "var(--cinereous)",
                                  }}
                                >
                                  We&apos;ll confirm or decline within 24–48
                                  hours. You can check back here anytime.
                                </p>
                              ) : null}
                              {c.status === "declined" ? (
                                <p
                                  style={{
                                    fontSize: "0.85rem",
                                    color: "var(--cinereous)",
                                  }}
                                >
                                  This slot could not be confirmed. Please pick
                                  another date on{" "}
                                  <Link
                                    href="/bespoke"
                                    className={styles.panelLink}
                                  >
                                    Book a slot
                                  </Link>{" "}
                                  or reach us on WhatsApp.
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
          )}
        </div>
      </div>

      {historyModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "600px",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--color-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2 className={styles.panelTitle} style={{ margin: 0 }}>
                Order History
              </h2>
              <button
                onClick={() => setHistoryModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--cinereous)",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className={styles.panelScroll} style={{ padding: "0" }}>
              <ul className={styles.ordersList} style={{ margin: 0 }}>
                {orders
                  .filter(
                    (o) =>
                      o.status === "package delivered" ||
                      o.status === "cancelled",
                  )
                  .map((o) => {
                    const isInternational =
                      o.shippingAddress.includes("(international)");
                    return (
                      <OrderCard
                        key={o.id}
                        o={o}
                        isInternational={isInternational}
                      />
                    );
                  })}
                {orders.filter(
                  (o) =>
                    o.status === "package delivered" ||
                    o.status === "cancelled",
                ).length === 0 && (
                  <div
                    className={styles.emptyState}
                    style={{ padding: "40px 24px" }}
                  >
                    <p>No past orders found.</p>
                  </div>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccountClient() {
  const user = useSyncExternalStore(
    authStore.subscribe,
    authStore.getUser,
    () => null,
  );
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
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  /** After sign-up, if Supabase requires email confirmation, collect OTP here. */
  const [pendingSignupEmail, setPendingSignupEmail] = useState<string | null>(
    null,
  );

  // ── Password-reset state ──
  const [resetEmail, setResetEmail] = useState("");
  const [sendingOTP, setSendingOTP] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(
    Array(RESET_DIGITS).fill(""),
  );
  const [verifyingOTP, setVerifyingOTP] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [resetError, setResetError] = useState("");

  // Phrases — picked once when the component mounts (i.e. each time user enters the step)
  const forgotPhrase = useState(() => randomPhrase(FORGOT_PHRASES))[0];
  const otpPhrase = useState(() => randomPhrase(OTP_PHRASES))[0];
  const newPassPhrase = useState(() => randomPhrase(NEW_PASS_PHRASES))[0];
  const successPhrase = useState(() => randomPhrase(SUCCESS_PHRASES))[0];

  // Resend cooldown ticker
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(
      () => setResendCooldown((s) => (s <= 1 ? 0 : s - 1)),
      1000,
    );
    return () => clearInterval(t);
  }, [resendCooldown]);

  // Reset ALL form state when the user signs out, so they always land on a
  // clean sign-in screen — no stale credentials, no leftover OTP digits, etc.
  useEffect(() => {
    if (user) return; // user just signed in or is still signed in — do nothing
    setMode("signin");
    setName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setError("");
    setPendingSignupEmail(null);
    setResetEmail("");
    setOtpDigits(Array(RESET_DIGITS).fill(""));
    setNewPass("");
    setConfirmPass("");
    setShowNewPass(false);
    setShowConfirmPass(false);
    setResetError("");
    setResendCooldown(0);
  }, [user]);

  const goToSignIn = () => {
    setMode("signin");
    setResetEmail("");
    setOtpDigits(Array(RESET_DIGITS).fill(""));
    setNewPass("");
    setConfirmPass("");
    setResetError("");
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    if (!resetEmail) return;
    try {
      setSendingOTP(true);
      await authStore.sendResetOTP(resetEmail.trim());
      setResendCooldown(60);
      setMode("otp");
    } catch (err) {
      setResetError(
        err instanceof Error ? err.message : "Could not send code.",
      );
    } finally {
      setSendingOTP(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    const code = otpDigits.join("");
    if (code.length !== RESET_DIGITS) {
      setResetError(`Enter the ${RESET_DIGITS}-digit code.`);
      return;
    }
    try {
      setVerifyingOTP(true);
      await authStore.verifyResetOTP(resetEmail.trim(), code);
      setMode("newpass");
    } catch (err) {
      setResetError(
        err instanceof Error ? err.message : "Invalid code. Try again.",
      );
    } finally {
      setVerifyingOTP(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    try {
      await authStore.sendResetOTP(resetEmail.trim());
      setResendCooldown(60);
    } catch {
      /* silent */
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    if (newPass.length < 8) {
      setResetError("Password must be at least 8 characters.");
      return;
    }
    if (newPass !== confirmPass) {
      setResetError("Passwords don't match.");
      return;
    }
    try {
      setSavingPass(true);
      await authStore.updatePassword(newPass);
      await authStore.signOut();
      setMode("success");
    } catch (err) {
      setResetError(
        err instanceof Error ? err.message : "Could not update password.",
      );
    } finally {
      setSavingPass(false);
    }
  };

  if (user && (mode === "signin" || mode === "signup")) {
    return <AccountDashboard userId={user.id} />;
  }

  // ── Password-reset flow (full-page early return) ──────────────────────────
  // IMPORTANT: must come before the `if (user)` check — verifyResetOTP creates
  // an active session, so `user` becomes non-null mid-flow.
  if (
    mode === "forgot" ||
    mode === "otp" ||
    mode === "newpass" ||
    mode === "success"
  ) {
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
              {mode === "forgot"
                ? "Password Reset"
                : mode === "otp"
                  ? "Enter Code"
                  : mode === "newpass"
                    ? "New Password"
                    : "All Set"}
            </h1>
          </div>
        </div>

        <div className="container">
          <div className={styles.authWrap}>
            {/* FORGOT — send OTP */}
            {mode === "forgot" && (
              <div className={styles.resetStep}>
                <p className={styles.resetPhrase}>{forgotPhrase}</p>
                <p className={styles.resetSub}>
                  Tap the button below to receive a one-time code to reset your
                  password.
                </p>
                <form onSubmit={handleSendOTP} className={styles.authForm}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="reset-email">
                      Email Address
                    </label>
                    <input
                      id="reset-email"
                      type="email"
                      className="form-input"
                      placeholder="your@email.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                  {resetError && (
                    <p className={styles.resetError}>{resetError}</p>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      marginTop: "var(--space-md)",
                    }}
                    disabled={sendingOTP || !resetEmail}
                  >
                    {sendingOTP ? "Sending…" : "Send Reset Code"}
                  </button>
                </form>
                <button
                  type="button"
                  className={styles.otpBack}
                  onClick={goToSignIn}
                >
                  ← Back to Sign in
                </button>
              </div>
            )}

            {/* OTP — enter code */}
            {mode === "otp" && (
              <div className={styles.resetStep}>
                <p className={styles.resetPhrase}>{otpPhrase}</p>
                <p className={styles.otpLead}>
                  We sent a <strong>{RESET_DIGITS}-digit code</strong> to{" "}
                  <span className={styles.otpEmail}>{resetEmail}</span>.
                </p>
                <form onSubmit={handleVerifyOTP} className={styles.otpForm}>
                  <ResetOTPInput value={otpDigits} onChange={setOtpDigits} />
                  {resetError && (
                    <p className={styles.resetError}>{resetError}</p>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      marginTop: "var(--space-md)",
                    }}
                    disabled={
                      verifyingOTP || otpDigits.join("").length !== RESET_DIGITS
                    }
                  >
                    {verifyingOTP ? "Verifying…" : "Verify Code"}
                  </button>
                </form>
                <p className={styles.otpResend}>
                  Didn&apos;t get it?{" "}
                  <button
                    type="button"
                    className={styles.otpResendBtn}
                    onClick={handleResendOTP}
                    disabled={resendCooldown > 0}
                  >
                    {resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : "Resend code"}
                  </button>
                </p>
                <button
                  type="button"
                  className={styles.otpBack}
                  onClick={() => setMode("forgot")}
                >
                  ← Back
                </button>
              </div>
            )}

            {/* NEW PASSWORD */}
            {mode === "newpass" && (
              <div className={styles.resetStep}>
                <p className={styles.resetPhrase}>{newPassPhrase}</p>
                <form
                  onSubmit={handleUpdatePassword}
                  className={styles.authForm}
                >
                  <div className="form-group">
                    <label className="form-label" htmlFor="new-password">
                      New Password
                    </label>
                    <div className={styles.passwordField}>
                      <input
                        id="new-password"
                        type={showNewPass ? "text" : "password"}
                        className="form-input"
                        placeholder="New password"
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() => setShowNewPass((v) => !v)}
                        aria-label={
                          showNewPass ? "Hide password" : "Show password"
                        }
                      >
                        {showNewPass ? (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="confirm-password">
                      Confirm Password
                    </label>
                    <div className={styles.passwordField}>
                      <input
                        id="confirm-password"
                        type={showConfirmPass ? "text" : "password"}
                        className="form-input"
                        placeholder="Confirm password"
                        value={confirmPass}
                        onChange={(e) => setConfirmPass(e.target.value)}
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() => setShowConfirmPass((v) => !v)}
                        aria-label={
                          showConfirmPass ? "Hide password" : "Show password"
                        }
                      >
                        {showConfirmPass ? (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  {resetError && (
                    <p className={styles.resetError}>{resetError}</p>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      marginTop: "var(--space-md)",
                    }}
                    disabled={savingPass || !newPass || !confirmPass}
                  >
                    {savingPass ? "Saving…" : "Save Password"}
                  </button>
                </form>
              </div>
            )}

            {/* SUCCESS */}
            {mode === "success" && (
              <div className={styles.resetStep} style={{ textAlign: "center" }}>
                <div className={styles.successIcon}>✓</div>
                <p className={styles.resetPhrase}>{successPhrase}</p>
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    marginTop: "var(--space-lg)",
                  }}
                  onClick={goToSignIn}
                >
                  Sign in
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
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
        const { needsEmailVerification } = await authStore.signUp(
          name,
          email,
          password,
        );
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
      const msg =
        err instanceof Error ? err.message : "Something went wrong. Try again.";
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
            {pendingSignupEmail
              ? "Verify email"
              : mode === "signin"
                ? "Sign In"
                : "Sign Up"}
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
                  onClick={() => {
                    setMode("signin");
                    setError("");
                    setPendingSignupEmail(null);
                    setShowPassword(false);
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`${styles.authTab} ${mode === "signup" ? styles.authTabActive : ""}`}
                  onClick={() => {
                    setMode("signup");
                    setError("");
                    setPendingSignupEmail(null);
                    setShowPassword(false);
                  }}
                >
                  Sign Up
                </button>
              </div>

              <form className={styles.authForm} onSubmit={handleSubmit}>
                {mode === "signup" && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="name">
                      Full Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      className="form-input"
                      placeholder="Your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="form-input"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="password">
                    Password
                  </label>
                  <div className={styles.passwordField}>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      className="form-input"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={
                        mode === "signup" ? "new-password" : "current-password"
                      }
                      required
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
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
                      color: "var(--error, #c00)",
                      fontSize: "0.85rem",
                      marginTop: "-8px",
                    }}
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    marginTop: "var(--space-md)",
                  }}
                  disabled={isLoading}
                >
                  {isLoading
                    ? mode === "signin"
                      ? "Signing in..."
                      : "Creating account..."
                    : mode === "signin"
                      ? "Sign In"
                      : "Create Account"}
                </button>
                {mode === "signin" && (
                  <div style={{ textAlign: "center" }}>
                    <button
                      type="button"
                      className={styles.forgotLink}
                      onClick={() => {
                        setResetEmail(email);
                        setMode("forgot");
                      }}
                    >
                      Forgot your password?
                    </button>
                  </div>
                )}
                {mode === "signup" && (
                  <p className={styles.signupPrivacy}>
                    Read our <Link href="/privacy">Privacy Policy</Link> to see
                    how we use your information.
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
