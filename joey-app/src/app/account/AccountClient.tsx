"use client";
import {
  useState,
  useSyncExternalStore,
  useEffect,
  useRef,
  useCallback,
} from "react";
import ProductMedia from "@/components/shop/ProductMedia";

import Link from "next/link";
import { CalendarDays, History, LogOut, MessageSquare, Package, X } from "lucide-react";
import { formatOrderAmount } from "@/lib/formatOrderAmount";
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
import { SignupOTPDialog } from "./SignupOTPDialog";

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
type Mode = "signin" | "signup" | "forgot" | "otp" | "newpass" | "success";

function AccountHeading({ title }: { title: string }) {
  return (
    <header className={`${styles.shell} ${styles.pageHeader}`}>
      <h1 className={styles.pageTitle}>{title}</h1>
    </header>
  );
}

function statusLabel(status: Order["status"]) {
  const map: Record<Order["status"], string> = {
    pending: "Pending",
    paid_requires_resolution: "Paid — Under Review",
    processing: "Processing",
    "in production": "In Production",
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
  return map[status] || status;
}

function consultationStatusLabel(status: ConsultationBooking["status"]) {
  const map: Record<ConsultationBooking["status"], string> = {
    pending: "Pending review",
    reschedule_proposed: "Reschedule proposed",
    confirmed: "Confirmed",
    declined: "Declined",
    cancelled: "Cancelled",
  };
  return map[status] || status;
}

function formatPreferredSlot(dateIso?: string, time24?: string) {
  if (!dateIso?.trim()) return null;
  const d = new Date(dateIso.length === 10 ? `${dateIso}T12:00:00Z` : dateIso);
  const dateLabel = Number.isNaN(d.getTime())
    ? dateIso
    : d.toLocaleDateString("en-US", {
        timeZone: "Africa/Accra",
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
  if (!time24?.trim()) return dateLabel;
  const time = time24.trim();
  const m = /^(\d{2}):(\d{2})$/.exec(time);
  if (!m) return `${dateLabel} • ${time} (GMT)`;
  const h = Number(m[1]);
  const mm = m[2];
  const hour12 = ((h + 11) % 12) + 1;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${dateLabel} • ${hour12}:${mm} ${ampm} (GMT)`;
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
        {line.image?.trim() ? (
          <ProductMedia src={line.image} alt="" className={styles.orderLineImg} />
        ) : (
          <span className={styles.orderLineImg} aria-hidden="true" />
        )}
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
            {formatOrderAmount(line.price)} each
          </span>
          {(line.fulfillmentType === "made_to_order" || line.isMadeToOrder || line.isBespoke) && (
            <span
              style={{
                marginTop: "4px",
                display: "inline-flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.75rem",
              }}
            >
              <span
                style={{
                  background: "#f4f4f5",
                  color: "#3f3f46",
                  border: "1px solid #d4d4d8",
                  padding: "2px 7px",
                  borderRadius: "4px",
                  fontWeight: 600,
                }}
              >
                Made to Order · {line.leadDays ?? line.bespokeLeadDays ?? 14} days
              </span>
              {line.estimatedReadyDate ? (
                <span style={{ color: "var(--cinereous)" }}>
                  Est. Production Ready: <strong>{line.estimatedReadyDate}</strong>
                </span>
              ) : null}
              {line.productionStatus && line.productionStatus !== "not_applicable" ? (
                <span style={{ color: "var(--cinereous)", textTransform: "capitalize" }}>
                  Status: <strong>{line.productionStatus.replace(/_/g, " ")}</strong>
                </span>
              ) : null}
            </span>
          )}
        </span>
      </Link>
      <span className={styles.orderLinePrice}>
        {formatOrderAmount(lineTotal)}
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

const DHL_CHECKPOINT_LABELS: Record<string, string> = {
  AD: "Delivery agreed", AF: "Arrived at DHL facility", AR: "Arrived at delivery facility",
  BA: "Delivery address needs correction", BN: "Customs broker notified", BR: "Released by broker",
  CA: "Closed on arrival", CC: "Awaiting recipient collection", CD: "Clearance delayed",
  CM: "Recipient moved", CR: "Cleared customs", CS: "Shipment closed",
  DD: "Delivered damaged", DF: "Departed DHL facility", DS: "Disposed of by DHL",
  FD: "Forwarded to destination", HP: "Held for payment", IC: "Customs clearance in progress",
  MC: "Shipment code needs correction", MD: "Missed delivery cycle", MS: "Shipment mis-sorted",
  ND: "Delivery unsuccessful", NH: "Recipient unavailable", OH: "Shipment on hold",
  OK: "Delivered", PD: "Partially delivered", PL: "Processed at DHL facility",
  PU: "Picked up by DHL", RD: "Delivery refused", RR: "Response received",
  RT: "Returned to sender", SA: "Accepted by DHL", SC: "Service changed",
  SS: "Shipment stopped", TP: "Forwarded to third party", TR: "Transferred",
  UD: "Clearance delayed", WC: "Out for delivery",
};

type DhlTrackingEvent = {
  typeCode?: string;
  date: string;
  time?: string;
  description: string;
  serviceArea?: { description?: string }[];
};

function OrderTracking({
  trackingNumber,
  dhlStatus,
  createdAt,
}: {
  trackingNumber: string;
  dhlStatus?: string;
  createdAt: string;
}) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<DhlTrackingEvent[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function fetchTracking() {
      setLoading(true);
      setEvents([]);
      setError(false);
      try {
        const res = await fetch(
          `/api/shipping/track?trackingNumber=${encodeURIComponent(trackingNumber)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!res.ok) throw new Error("Failed to fetch tracking");
        const data: { shipments?: { events?: DhlTrackingEvent[] }[] } = await res.json();
        const shipmentEvents = data.shipments?.[0]?.events;
        if (!controller.signal.aborted && Array.isArray(shipmentEvents)) setEvents(shipmentEvents);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void fetchTracking();
    return () => controller.abort();
  }, [trackingNumber]);

  const allEvents: DhlTrackingEvent[] = [
    { date: createdAt, description: "Order received" },
    ...[...events].sort((a, b) =>
      `${a.date}T${a.time ?? ""}`.localeCompare(`${b.date}T${b.time ?? ""}`),
    ),
  ];
  const awaitingScan = dhlStatus?.startsWith("Pickup Scheduled")
    ? "Pickup scheduled. Tracking updates appear after DHL scans the parcel."
    : "Label created. Tracking updates appear after DHL scans the parcel.";

  return (
    <div className={styles.trackingPanel}>
      <div className={styles.trackingHeader}>
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
        <a
          href={`https://www.dhl.com/gh-en/home/tracking/tracking-express.html?submit=1&tracking-id=${trackingNumber}`}
          target="_blank"
          rel="noreferrer"
          className={styles.outlineButton}
        >
          Track on DHL
        </a>
      </div>

      <div className={styles.trackingBody}>
        {loading && (
          <p style={{ fontSize: "0.85rem", color: "var(--cinereous)" }}>
            Loading tracking events...
          </p>
        )}
        {error && (
          <p style={{ fontSize: "0.85rem", color: "var(--error)" }}>
            DHL tracking is temporarily unavailable. You can also use Track on DHL.
          </p>
        )}
        {!loading && !error && events.length === 0 && (
          <p style={{ fontSize: "0.85rem", color: "var(--cinereous)" }}>{awaitingScan}</p>
        )}
        {!loading && (
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
                  <strong>{ev.description || DHL_CHECKPOINT_LABELS[ev.typeCode ?? ""] || "DHL tracking update"}</strong>
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

function ManualOrderTracking({
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

  const MANUAL_SEQUENCE = [
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
    const seqIdx = MANUAL_SEQUENCE.indexOf(e.status);
    if (seqIdx >= 0) {
      for (let i = 0; i < seqIdx; i++) {
        const skippedStatus = MANUAL_SEQUENCE[i];
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
    const lastIdx = MANUAL_SEQUENCE.indexOf(lastStatus);
    if (lastIdx >= 0) {
      for (let i = lastIdx + 1; i < MANUAL_SEQUENCE.length; i++) {
        if (!handledStatuses.has(MANUAL_SEQUENCE[i])) {
          timelineData.push({
            status: MANUAL_SEQUENCE[i],
            timestamp: null,
            isCompleted: false,
            isCurrent: false,
          });
          handledStatuses.add(MANUAL_SEQUENCE[i]);
        }
      }
    }
  }

  return (
    <div className={styles.trackingPanel}>
      <div className={styles.trackingHeader}>
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

function OrderCard({ o }: { o: Order }) {
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const awaitsCarrierTracking = /\|\s*DHL\[[^\]]+\](?:\s*\(international\))?\s*$/i.test(o.shippingAddress);

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
          {!o.dhlTrackingNumber && (
            <span className={styles.orderStatus}>{statusLabel(o.status)}</span>
          )}
          <span className={styles.orderTotal}>{formatOrderAmount(o.total)}</span>
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
      {(o.notes?.trim() || o.dhlTrackingNumber || !awaitsCarrierTracking) && (
        <div className={styles.orderFooter}>
          {o.notes?.trim() && (
            <p className={styles.orderNotes}>
              <span className={styles.orderNotesLabel}>Your note</span>
              {o.notes.trim()}
            </p>
          )}
          {(o.dhlTrackingNumber || !awaitsCarrierTracking) && (
            <button
              type="button"
              className={styles.outlineButton}
              aria-expanded={isTimelineOpen}
              onClick={() => setIsTimelineOpen((open) => !open)}
            >
              {isTimelineOpen
                ? "Hide progress"
                : o.dhlTrackingNumber
                  ? "Track shipment"
                  : "Order progress"}
            </button>
          )}
        </div>
      )}

      {/* If timeline is open, render tracking block */}
      {o.dhlTrackingNumber && isTimelineOpen && (
        <OrderTracking
          trackingNumber={o.dhlTrackingNumber}
          dhlStatus={o.dhlStatus}
          createdAt={o.createdAt}
        />
      )}
      {!o.dhlTrackingNumber && !awaitsCarrierTracking && isTimelineOpen && (
        <ManualOrderTracking
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
  const [activeTab, setActiveTab] = useState<"orders" | "appointments">(
    "orders",
  );
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const historyDialogRef = useRef<HTMLDialogElement>(null);

  const loadOrders = useCallback(async () => {
    try {
      const list = await dataStore.getOrdersForUser(userId);
      setOrders(list);
      setOrdersError("");
    } catch {
      setOrders([]);
      setOrdersError("We couldn’t load your orders.");
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
      setConsultationsError("We couldn’t load your appointments.");
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
    if (historyModalOpen) historyDialogRef.current?.showModal();
  }, [historyModalOpen]);

  const isPastOrder = (order: Order) =>
    ["delivered", "package delivered", "cancelled"].includes(order.status);
  const pastOrders = orders.filter(isPastOrder);
  const activeOrders = orders.filter((order) => !isPastOrder(order));

  return (
    <div className={styles.page}>
      <AccountHeading title="My account" />

      <div className={`${styles.shell} ${styles.dashboard}`}>
        <aside className={styles.profile}>
          <div className={styles.profileIdentity}>
            <span className={styles.profileAvatar} aria-hidden="true">
              {authStore.getInitials()}
            </span>
            <div>
              {user?.name && <p className={styles.profileName}>{user.name}</p>}
              <p className={styles.profileEmail}>{user?.email}</p>
            </div>
          </div>
          <nav className={styles.accountNav} aria-label="Account sections">
            <button
              type="button"
              aria-current={activeTab === "orders" ? "true" : undefined}
              onClick={() => setActiveTab("orders")}
            >
              <Package size={18} aria-hidden="true" /> Orders
            </button>
            <button
              type="button"
              aria-current={activeTab === "appointments" ? "true" : undefined}
              onClick={() => setActiveTab("appointments")}
            >
              <CalendarDays size={18} aria-hidden="true" /> Appointments
            </button>
          </nav>
          <div className={styles.profileActions}>
            <Link href="/report-issue?from=account">
              <MessageSquare size={17} aria-hidden="true" /> Report an issue
            </Link>
            <button type="button" onClick={() => void authStore.signOut()}>
              <LogOut size={17} aria-hidden="true" /> Sign out
            </button>
          </div>
        </aside>

        <div className={styles.dashboardContent}>
          {activeTab === "orders" && (
            <section aria-labelledby="account-orders">
              <div className={styles.sectionHeader}>
                <h2 id="account-orders" className={styles.sectionTitle}>Orders</h2>
                <div className={styles.sectionActions}>
                  <button
                    type="button"
                    className={styles.outlineButton}
                    aria-haspopup="dialog"
                    onClick={() => setHistoryModalOpen(true)}
                  >
                    <History size={17} aria-hidden="true" /> Order history
                  </button>
                  <Link href="/shop" className={styles.solidButton}>Shop</Link>
                </div>
              </div>
              {ordersLoading ? (
                <div className={styles.emptyState} role="status">Loading orders…</div>
              ) : ordersError ? (
                <div className={styles.emptyState}>
                  <p role="alert">{ordersError}</p>
                  <button
                    type="button"
                    className={styles.outlineButton}
                    onClick={() => {
                      setOrdersError("");
                      setOrdersLoading(true);
                      void loadOrders();
                    }}
                  >
                    Try again
                  </button>
                </div>
              ) : activeOrders.length === 0 ? (
                <div className={styles.emptyState}>
                  <Package size={26} strokeWidth={1.5} aria-hidden="true" />
                  <h3>{orders.length ? "No active orders" : "No orders yet"}</h3>
                  <p>{orders.length
                    ? "See completed and cancelled orders in your order history."
                    : "Orders placed while signed in will appear here."}</p>
                </div>
              ) : (
                <ul className={styles.ordersList}>
                  {activeOrders.map((order) => <OrderCard key={order.id} o={order} />)}
                </ul>
              )}
            </section>
          )}

          {activeTab === "appointments" && (
            <section aria-labelledby="account-appointments">
              <div className={styles.sectionHeader}>
                <h2 id="account-appointments" className={styles.sectionTitle}>Bespoke appointments</h2>
                <Link href="/bespoke" className={styles.solidButton}>Book a consultation</Link>
              </div>
              <div>
                {consultationsLoading ? (
                  <div className={styles.emptyState} role="status">Loading appointments…</div>
                ) : consultationsError ? (
                  <div className={styles.emptyState}>
                    <p role="alert">{consultationsError}</p>
                    <button
                      type="button"
                      className={styles.outlineButton}
                      onClick={() => {
                        setConsultationsError("");
                        setConsultationsLoading(true);
                        void loadConsultations();
                      }}
                    >
                      Try again
                    </button>
                  </div>
                ) : consultations.length === 0 ? (
                  <div className={styles.emptyState}>
                    <CalendarDays size={26} strokeWidth={1.5} aria-hidden="true" />
                    <h3>No appointments yet</h3>
                    <p>Book a consultation while signed in to see its status here.</p>
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
                              {c.status === "reschedule_proposed" && c.proposedScheduledAt ? (
                                <p style={{ marginTop: "var(--space-sm)" }}>
                                  <span style={{ color: "var(--cinereous)" }}>
                                    Proposed new time:{" "}
                                  </span>
                                  <strong>
                                    {formatConsultationAppointmentLocal(
                                      c.proposedScheduledAt,
                                    )}
                                  </strong>
                                  {c.rescheduleNote ? (
                                    <span style={{ display: "block", fontSize: "0.85rem", color: "var(--cinereous)", marginTop: 4 }}>
                                      Note from JOEY: {c.rescheduleNote}
                                    </span>
                                  ) : null}
                                  <span style={{ display: "block", fontSize: "0.85rem", color: "var(--cinereous)", marginTop: 4 }}>
                                    Please check your email for your secure link to accept this date or request another time.
                                  </span>
                                </p>
                              ) : null}
                              {c.status === "pending" ? (
                                <p
                                  style={{
                                    fontSize: "0.85rem",
                                    color: "var(--cinereous)",
                                  }}
                                >
                                  We&apos;ll confirm or propose a schedule within 24–48
                                  hours. You can check back here anytime.
                                </p>
                              ) : null}
                              {c.status === "declined" || c.status === "cancelled" ? (
                                <p
                                  style={{
                                    fontSize: "0.85rem",
                                    color: "var(--cinereous)",
                                  }}
                                >
                                  {c.status === "cancelled"
                                    ? "This appointment has been cancelled."
                                    : "This slot could not be confirmed."}{" "}
                                  {c.cancellationReason ? `${c.cancellationReason} ` : ""}
                                  {c.refundReviewRequired
                                    ? "Your deposit has been flagged for manual review by our team in accordance with our business policy. "
                                    : ""}
                                  Please pick another date on{" "}
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
            </section>
          )}
        </div>
      </div>

      <dialog
        className={styles.historyDialog}
        ref={historyDialogRef}
        aria-labelledby="order-history-title"
        onClose={() => setHistoryModalOpen(false)}
      >
        <div className={styles.dialogHeader}>
          <h2 id="order-history-title" className={styles.sectionTitle}>Order history</h2>
          <form method="dialog">
            <button type="submit" className={styles.closeButton} aria-label="Close order history">
              <X size={22} aria-hidden="true" />
            </button>
          </form>
        </div>
        {ordersLoading ? (
          <div className={styles.emptyState} role="status">Loading orders…</div>
        ) : ordersError ? (
          <div className={styles.emptyState} role="alert">{ordersError}</div>
        ) : pastOrders.length ? (
          historyModalOpen && (
            <ul className={styles.ordersList}>
              {pastOrders.map((order) => <OrderCard key={order.id} o={order} />)}
            </ul>
          )
        ) : (
          <div className={styles.emptyState}>
            <History size={25} strokeWidth={1.5} aria-hidden="true" />
            <h3>No past orders yet</h3>
          </div>
        )}
      </dialog>
    </div>
  );
}

export default function AccountClient() {
  const user = useSyncExternalStore(
    authStore.subscribe,
    authStore.getUser,
    () => null,
  );
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
        <AccountHeading title="Account" />
        <div className={styles.shell}>
          <div className={styles.authWrap}>
            <h2 className={styles.sectionTitle}>
              {mode === "forgot"
                ? "Reset your password"
                : mode === "otp"
                  ? "Enter your code"
                  : mode === "newpass"
                    ? "Choose a new password"
                    : "Password updated"}
            </h2>
            {/* FORGOT — send OTP */}
            {mode === "forgot" && (
              <div className={styles.resetStep}>
                <p className={styles.resetSub}>
                  Enter your email address to receive a password reset code.
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
                    <p className={styles.resetError} role="alert">{resetError}</p>
                  )}
                  <button
                    type="submit"
                    className={styles.solidButton}
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
                <p className={styles.otpLead}>
                  We sent a <strong>{RESET_DIGITS}-digit code</strong> to{" "}
                  <span className={styles.otpEmail}>{resetEmail}</span>.
                </p>
                <form onSubmit={handleVerifyOTP} className={styles.otpForm}>
                  <ResetOTPInput value={otpDigits} onChange={setOtpDigits} />
                  {resetError && (
                    <p className={styles.resetError} role="alert">{resetError}</p>
                  )}
                  <button
                    type="submit"
                    className={styles.solidButton}
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
                    <p className={styles.resetError} role="alert">{resetError}</p>
                  )}
                  <button
                    type="submit"
                    className={styles.solidButton}
                    disabled={savingPass || !newPass || !confirmPass}
                  >
                    {savingPass ? "Saving…" : "Save Password"}
                  </button>
                </form>
              </div>
            )}

            {/* SUCCESS */}
            {mode === "success" && (
              <div className={styles.resetStep}>
                <p className={styles.resetSub}>You can now sign in with your new password.</p>
                <button
                  type="button"
                  className={styles.solidButton}
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
      <AccountHeading title="Account" />
      <div className={styles.shell}>
        <div className={styles.authWrap}>
          <h2 className={styles.sectionTitle}>
            {pendingSignupEmail ? "Verify your email" : mode === "signin" ? "Sign in" : "Create an account"}
          </h2>
          {!pendingSignupEmail ? (
            <>
              <div className={styles.authTabs}>
                <button
                  type="button"
                  className={styles.authTab}
                  aria-pressed={mode === "signin"}
                  onClick={() => {
                    setMode("signin");
                    setError("");
                    setPendingSignupEmail(null);
                    setShowPassword(false);
                  }}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={styles.authTab}
                  aria-pressed={mode === "signup"}
                  onClick={() => {
                    setMode("signup");
                    setError("");
                    setPendingSignupEmail(null);
                    setShowPassword(false);
                  }}
                >
                  Sign up
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
                  <p className={styles.resetError} role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className={styles.solidButton}
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
