"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { dataStore } from "@/lib/dataStore";
import type { ConsultationBooking, ConsultationSource } from "@/lib/types";
import { openConsultationPrintWindow } from "@/lib/printConsultation";
import { ArrowLeft, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";

function formatPreferred(dateIso?: string, time24?: string) {
  if (!dateIso?.trim()) return "—";
  const d = new Date(dateIso.length === 10 ? `${dateIso}T12:00:00` : dateIso);
  const dateLabel = Number.isNaN(d.getTime())
    ? dateIso
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
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

function formatScheduled(iso?: string) {
  if (!iso?.trim()) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function ConsultationsPage() {
  const [rows, setRows] = useState<ConsultationBooking[]>([]);
  const [tab, setTab] = useState<ConsultationSource>("shop");
  const [dayRuleOpen, setDayRuleOpen] = useState(false);
  const [dayRuleDate, setDayRuleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dayRuleMax, setDayRuleMax] = useState(7);
  const [dayRuleSaving, setDayRuleSaving] = useState(false);
  const [dayRuleError, setDayRuleError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<ConsultationBooking | null>(null);
  const [declineTarget, setDeclineTarget] = useState<ConsultationBooking | null>(null);
  const [modalDate, setModalDate] = useState("");
  const [modalTime, setModalTime] = useState("10:00");
  const [modalError, setModalError] = useState("");

  const load = useCallback(async () => {
    try {
      const [bookings] = await Promise.all([
        dataStore.getConsultationBookings(),
      ]);
      setRows(bookings);
    } catch (err) {
      console.error("Failed to load consultations:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    return dataStore.subscribe(load);
  }, [load]);

  useEffect(() => {
    if (!confirmTarget) return;
    const base =
      confirmTarget.preferredDate?.slice(0, 10) || new Date().toISOString().slice(0, 10);
    setModalDate(base);
    setModalTime("10:00");
    setModalError("");
  }, [confirmTarget]);

  const saveDayRule = async () => {
    setDayRuleError("");
    setDayRuleSaving(true);
    try {
      await dataStore.upsertConsultationDayRule(dayRuleDate, dayRuleMax);
      await load();
      setDayRuleOpen(false);
      toast.success("Calendar rule saved.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save calendar rule.";
      setDayRuleError(msg);
      toast.error(msg);
    } finally {
      setDayRuleSaving(false);
    }
  };

  const submitConfirm = async () => {
    if (!confirmTarget) return;
    setModalError("");
    const t = modalTime.length === 5 ? `${modalTime}:00` : modalTime;
    const local = new Date(`${modalDate}T${t}`);
    if (Number.isNaN(local.getTime())) {
      setModalError("Invalid date or time.");
      return;
    }
    const iso = local.toISOString();
    setUpdatingId(confirmTarget.id);
    try {
      await dataStore.confirmConsultation(confirmTarget.id, iso);
      setConfirmTarget(null);
      await load();
      toast.success("Consultation confirmed and scheduled.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to confirm.";
      setModalError(msg);
      toast.error(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const onDecline = async (b: ConsultationBooking) => {
    setUpdatingId(b.id);
    try {
      await dataStore.declineConsultation(b.id);
      await load();
      toast.success(
        b.status === "confirmed" ? "Appointment revoked." : "Request declined.",
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not update request.";
      toast.error(msg);
      console.error(err);
    } finally {
      setUpdatingId(null);
      setDeclineTarget(null);
    }
  };

  const onMarkPaid = async (id: string) => {
    setUpdatingId(id);
    try {
      await dataStore.updateConsultationPaymentStatus(id, "paid");
      await load();
      toast.success("Marked as paid.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not update payment.";
      toast.error(msg);
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const openConfirm = (b: ConsultationBooking) => {
    if (b.paymentStatus !== "paid") {
      toast.error("This booking is not paid yet. Mark it as paid before confirming.");
      return;
    }
    setConfirmTarget(b);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-zinc-900">Loading consultations…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {confirmTarget ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-consultation-title"
          onClick={() => updatingId !== confirmTarget.id && setConfirmTarget(null)}
        >
          <div
            className="consultations-confirm-dialog w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-consultation-title" className="text-lg font-semibold text-zinc-900">
              Confirm appointment
            </h2>
            <p className="mt-1 text-sm text-zinc-800">
              {confirmTarget.customerName} · {confirmTarget.service}
            </p>
            <p className="mt-3 text-sm text-zinc-800">
              Set the date and time they should arrive.{" "}
              {confirmTarget.source === "portfolio"
                ? "They will see the booking code and time on their portfolio booking page (the link from their submission)."
                : "They will see this with their booking code on their shop account."}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="confirm-date" className="block text-xs font-medium text-zinc-600">
                  Date
                </label>
                <input
                  id="confirm-date"
                  type="date"
                  className="mt-1 w-full"
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="confirm-time" className="block text-xs font-medium text-zinc-600">
                  Time
                </label>
                <input
                  id="confirm-time"
                  type="time"
                  className="mt-1 w-full"
                  value={modalTime}
                  onChange={(e) => setModalTime(e.target.value)}
                />
              </div>
            </div>
            {modalError ? <p className="mt-3 text-sm text-red-600">{modalError}</p> : null}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                onClick={() => setConfirmTarget(null)}
                disabled={updatingId === confirmTarget.id}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                onClick={() => void submitConfirm()}
                disabled={updatingId === confirmTarget.id}
              >
                {updatingId === confirmTarget.id ? "Saving…" : "Confirm & issue code"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {dayRuleOpen ? (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="day-rule-title"
        >
          <div
            className="fixed inset-0 bg-black/55 backdrop-blur-sm"
            aria-hidden
            onClick={() => !dayRuleSaving && setDayRuleOpen(false)}
          />
          <div
            className="relative consultations-confirm-dialog w-full max-w-md overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="day-rule-title" className="text-lg font-semibold text-zinc-900">
              Calendar rule (single day)
            </h2>
            <p className="mt-1 text-sm text-zinc-800">
              Pick a day and override how many confirmed consultations are allowed on that day.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="day-rule-date" className="block text-xs font-semibold uppercase tracking-wide text-zinc-600">
                  Day
                </label>
                <input
                  id="day-rule-date"
                  type="date"
                  className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                  value={dayRuleDate}
                  onChange={(e) => setDayRuleDate(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="day-rule-max" className="block text-xs font-semibold uppercase tracking-wide text-zinc-600">
                  Max consultations per day
                </label>
                <input
                  id="day-rule-max"
                  type="number"
                  min={1}
                  max={50}
                  className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                  value={dayRuleMax}
                  onChange={(e) => setDayRuleMax(Number(e.target.value))}
                />
              </div>
            </div>

            {dayRuleError ? <p className="mt-3 text-sm text-red-600">{dayRuleError}</p> : null}

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                onClick={() => setDayRuleOpen(false)}
                disabled={dayRuleSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                onClick={() => void saveDayRule()}
                disabled={dayRuleSaving}
              >
                {dayRuleSaving ? "Saving…" : "Save calendar rule"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link 
            href="/content" 
            className="inline-flex items-center gap-1.5 text-sm mb-4 text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Site Content
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Consultations</h1>
        </div>
        <span className="text-sm text-zinc-800">{rows.length} total</span>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-0">
        {(
          [
            { id: "shop" as const, label: "Shop (app)" },
            { id: "portfolio" as const, label: "Portfolio site" },
          ] as const
        ).map((t) => {
          const count = rows.filter((r) => r.source === t.id).length;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-t-lg border border-b-0 px-4 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "border-zinc-200 bg-white text-zinc-900"
                  : "border-transparent bg-zinc-100/80 text-zinc-800 hover:bg-zinc-100"
              }`}
            >
              {t.label}
              <span className="ml-2 rounded-full bg-zinc-200/80 px-2 py-0.5 text-xs text-zinc-700">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="text-sm text-zinc-700">
          Set the max number of consultation slots for a specific day.
        </div>
        <button
          type="button"
          className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          onClick={() => {
            setDayRuleError("");
            setDayRuleDate(new Date().toISOString().slice(0, 10));
            setDayRuleMax(7);
            setDayRuleOpen(true);
          }}
        >
          Add day rule…
        </button>
      </div>

      <div className="overflow-hidden rounded-xl rounded-tl-none border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          {(() => {
            const filtered = rows.filter((r) => r.source === tab);
            if (filtered.length === 0) {
              return (
                <div className="py-12 text-center">
                  <CalendarRange className="mx-auto h-12 w-12 text-zinc-300" />
                  <h3 className="mt-2 text-sm font-semibold text-zinc-900">No requests in this tab</h3>
                  <p className="mt-1 text-sm text-zinc-800">
                    {tab === "shop"
                      ? "Signed-in customers who submit the bespoke form on the shop will appear here."
                      : "Submissions from the portfolio booking page appear here."}
                  </p>
                </div>
              );
            }
            return (
            <table className="min-w-[1180px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-100">
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900">
                    Requested
                  </th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900">
                    Customer
                  </th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900">
                    Service
                  </th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900">
                    Preferred
                  </th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900">
                    Scheduled
                  </th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900">
                    Code
                  </th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900">
                    Status
                  </th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900">
                    Payment
                  </th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((b) => (
                  <tr key={b.id} className="align-top transition hover:bg-white/[0.07]">
                    <td className="px-5 py-4 text-sm text-zinc-700 whitespace-nowrap">
                      {new Date(b.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <div className="font-medium text-zinc-900">{b.customerName}</div>
                      <div className="text-zinc-800">{b.customerEmail}</div>
                      <div className="text-zinc-800">{b.customerPhone}</div>
                    </td>
                    <td className="px-5 py-4 text-sm text-zinc-800 max-w-[180px]">{b.service}</td>
                    <td className="px-5 py-4 text-sm text-zinc-800 whitespace-nowrap">
                      {formatPreferred(b.preferredDate, b.preferredTime)}
                    </td>
                    <td className="px-5 py-4 text-sm text-zinc-800 whitespace-nowrap">
                      {formatScheduled(b.scheduledAt)}
                      {b.durationHours ? (
                        <div className="text-[11px] text-zinc-700 mt-1 uppercase tracking-wider">
                          {b.durationHours}h Session
                        </div>
                      ) : null}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      {b.bookingCode ? (
                        <code className="rounded bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-900">
                          {b.bookingCode}
                        </code>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          b.status === "pending"
                            ? "bg-amber-100 text-amber-900"
                            : b.status === "confirmed"
                              ? "bg-emerald-100 text-emerald-900"
                              : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {b.status === "pending"
                          ? "Pending"
                          : b.status === "confirmed"
                            ? "Confirmed"
                            : "Declined"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            b.paymentStatus === "paid"
                              ? "bg-emerald-100 text-emerald-900"
                              : "bg-red-100 text-red-900"
                          }`}
                        >
                          {b.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                        </span>

                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <div className="flex flex-col gap-2 min-w-[120px]">
                        {b.status === "pending" ? (
                          <>
                            <button
                              type="button"
                              className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                              disabled={updatingId === b.id}
                              onClick={() => openConfirm(b)}
                            >
                              Confirm…
                            </button>
                            <button
                              type="button"
                              className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                              disabled={updatingId === b.id}
                              onClick={() => setDeclineTarget(b)}
                            >
                              Decline
                            </button>
                            {b.paymentStatus !== "paid" ? (
                              <button
                                type="button"
                                className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
                                disabled={updatingId === b.id}
                                onClick={() => void onMarkPaid(b.id)}
                              >
                                Mark as Paid
                              </button>
                            ) : null}
                          </>
                        ) : b.status === "confirmed" ? (
                          <>
                            <button
                              type="button"
                              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
                              disabled={updatingId === b.id}
                              onClick={() => openConsultationPrintWindow(b)}
                            >
                              Print slip
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-zinc-600">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            );
          })()}
        </div>
      </div>

      <ConfirmDialog
        open={declineTarget !== null}
        title={declineTarget?.status === "confirmed" ? "Revoke appointment?" : "Decline request?"}
        description={
          declineTarget ? (
            declineTarget.status === "confirmed"
              ? "Revoke this confirmed appointment? The customer will lose their booking code and time. This cannot be undone."
              : declineTarget.source === "portfolio"
                ? "Decline this request? Their private portfolio booking link will show Declined. This cannot be undone."
                : "Decline this request? The customer will see Declined on their shop account. This cannot be undone."
          ) : undefined
        }
        confirmLabel="Decline"
        variant="danger"
        onCancel={() => setDeclineTarget(null)}
        onConfirm={async () => {
          if (declineTarget) await onDecline(declineTarget);
        }}
      />
    </div>
  );
}
