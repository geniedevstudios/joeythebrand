"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { dataStore } from "@/lib/dataStore";
import type { ConsultationBooking, ConsultationSource } from "@/lib/types";
import { openConsultationPrintWindow } from "@/lib/printConsultation";
import {
  accraDateAndTimeToIso,
  formatConsultationAppointmentLocal,
  formatPreferredSlotAccra,
  isoToAccraDateAndTime,
} from "@/lib/formatConsultationAppointment";
import { ArrowLeft, CalendarRange } from "lucide-react";
import { toast } from "sonner";

function formatCreatedAccra(iso?: string) {
  if (!iso?.trim()) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    timeZone: "Africa/Accra",
    dateStyle: "medium",
    timeStyle: "short",
  });
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

  // Confirm modal state
  const [confirmTarget, setConfirmTarget] = useState<ConsultationBooking | null>(null);
  const [modalDate, setModalDate] = useState("");
  const [modalTime, setModalTime] = useState("10:00");
  const [modalError, setModalError] = useState("");

  // Reschedule modal state
  const [rescheduleTarget, setRescheduleTarget] = useState<ConsultationBooking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("10:00");
  const [rescheduleNote, setRescheduleNote] = useState("");
  const [rescheduleError, setRescheduleError] = useState("");

  // Cancel modal state (exceptional cases)
  const [cancelTarget, setCancelTarget] = useState<ConsultationBooking | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");

  const load = useCallback(async () => {
    try {
      const [bookings] = await Promise.all([dataStore.getConsultationBookings()]);
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
    if (confirmTarget.proposedScheduledAt) {
      const accra = isoToAccraDateAndTime(confirmTarget.proposedScheduledAt);
      if (accra) {
        setModalDate(accra.date);
        setModalTime(accra.time);
        setModalError("");
        return;
      }
    }
    const base =
      confirmTarget.preferredDate?.slice(0, 10) || new Date().toISOString().slice(0, 10);
    setModalDate(base);
    setModalTime(confirmTarget.preferredTime?.slice(0, 5) || "10:00");
    setModalError("");
  }, [confirmTarget]);

  useEffect(() => {
    if (!rescheduleTarget) return;
    if (rescheduleTarget.proposedScheduledAt) {
      const accra = isoToAccraDateAndTime(rescheduleTarget.proposedScheduledAt);
      if (accra) {
        setRescheduleDate(accra.date);
        setRescheduleTime(accra.time);
        setRescheduleNote(rescheduleTarget.rescheduleNote || "");
        setRescheduleError("");
        return;
      }
    }
    const base =
      rescheduleTarget.preferredDate?.slice(0, 10) || new Date().toISOString().slice(0, 10);
    setRescheduleDate(base);
    setRescheduleTime(rescheduleTarget.preferredTime?.slice(0, 5) || "10:00");
    setRescheduleNote("");
    setRescheduleError("");
  }, [rescheduleTarget]);

  useEffect(() => {
    if (!cancelTarget) return;
    setCancelReason("");
    setCancelError("");
  }, [cancelTarget]);

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
    const iso = accraDateAndTimeToIso(modalDate, modalTime);
    if (!iso) {
      setModalError("Invalid date or time (Africa/Accra).");
      return;
    }
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

  const submitReschedule = async () => {
    if (!rescheduleTarget) return;
    setRescheduleError("");
    const iso = accraDateAndTimeToIso(rescheduleDate, rescheduleTime);
    if (!iso) {
      setRescheduleError("Invalid proposed date or time (Africa/Accra).");
      return;
    }
    setUpdatingId(rescheduleTarget.id);
    try {
      await dataStore.proposeConsultationReschedule(rescheduleTarget.id, {
        proposedDate: rescheduleDate,
        proposedTime: rescheduleTime,
        proposedScheduledAtIso: iso,
        rescheduleNote: rescheduleNote.trim() || undefined,
      });
      setRescheduleTarget(null);
      await load();
      toast.success("Reschedule proposal saved and sent to customer.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to propose reschedule.";
      setRescheduleError(msg);
      toast.error(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const submitCancel = async () => {
    if (!cancelTarget) return;
    setCancelError("");
    setUpdatingId(cancelTarget.id);
    try {
      await dataStore.cancelConsultation(cancelTarget.id, cancelReason.trim() || undefined);
      setCancelTarget(null);
      await load();
      toast.success(
        cancelTarget.paymentStatus === "paid"
          ? "Consultation cancelled. Customer notified & deposit flagged for manual review."
          : "Consultation cancelled and customer notified.",
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not cancel booking.";
      setCancelError(msg);
      toast.error(msg);
    } finally {
      setUpdatingId(null);
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

  const openReschedule = (b: ConsultationBooking) => {
    if (b.paymentStatus !== "paid") {
      toast.error("This booking is not paid yet. Mark it as paid before proposing a reschedule.");
      return;
    }
    setRescheduleTarget(b);
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
      {/* Confirm Modal */}
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
              Set the confirmed date and time in <strong>Africa/Accra (GMT)</strong>.{" "}
              {confirmTarget.source === "portfolio"
                ? "They will receive their confirmation email and see the booking code on their portfolio slip."
                : "They will receive their confirmation email and see the booking code on their shop account."}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="confirm-date" className="block text-xs font-medium text-zinc-600">
                  Date (Africa/Accra)
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
                  Time (GMT)
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

      {/* Reschedule Proposal Modal */}
      {rescheduleTarget ? (
        <div
          className="fixed inset-0 z-[205] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reschedule-consultation-title"
          onClick={() => updatingId !== rescheduleTarget.id && setRescheduleTarget(null)}
        >
          <div
            className="consultations-confirm-dialog w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="reschedule-consultation-title" className="text-lg font-semibold text-zinc-900">
              Propose Reschedule
            </h2>
            <p className="mt-1 text-sm text-zinc-800">
              {rescheduleTarget.customerName} · {rescheduleTarget.service}
            </p>
            <p className="mt-2 text-xs text-zinc-600">
              Customer preferred: <strong>{formatPreferredSlotAccra(rescheduleTarget.preferredDate, rescheduleTarget.preferredTime)}</strong>
            </p>
            <p className="mt-3 text-sm text-zinc-800">
              Select a proposed date and time in <strong>Africa/Accra (GMT)</strong>. The proposal is saved separately from the confirmed appointment and emails the customer single-use links to <strong>Accept New Date</strong> or <strong>Request Another Time</strong>.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="reschedule-date" className="block text-xs font-medium text-zinc-600">
                  Proposed Date (Africa/Accra)
                </label>
                <input
                  id="reschedule-date"
                  type="date"
                  className="mt-1 w-full"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="reschedule-time" className="block text-xs font-medium text-zinc-600">
                  Proposed Time (GMT)
                </label>
                <input
                  id="reschedule-time"
                  type="time"
                  className="mt-1 w-full"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4">
              <label htmlFor="reschedule-note" className="block text-xs font-medium text-zinc-600">
                Optional Note for Customer
              </label>
              <textarea
                id="reschedule-note"
                rows={3}
                className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                placeholder="Let the client know why you're proposing this slot or share extra context…"
                value={rescheduleNote}
                onChange={(e) => setRescheduleNote(e.target.value)}
              />
            </div>
            {rescheduleError ? <p className="mt-3 text-sm text-red-600">{rescheduleError}</p> : null}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                onClick={() => setRescheduleTarget(null)}
                disabled={updatingId === rescheduleTarget.id}
              >
                Close
              </button>
              <button
                type="button"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                onClick={() => void submitReschedule()}
                disabled={updatingId === rescheduleTarget.id}
              >
                {updatingId === rescheduleTarget.id ? "Sending…" : "Send Reschedule Proposal"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Exceptional Cancel Modal */}
      {cancelTarget ? (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-consultation-title"
          onClick={() => updatingId !== cancelTarget.id && setCancelTarget(null)}
        >
          <div
            className="consultations-confirm-dialog w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="cancel-consultation-title" className="text-lg font-semibold text-zinc-900">
              Cancel Consultation (Exceptional)
            </h2>
            <p className="mt-1 text-sm text-zinc-800">
              {cancelTarget.customerName} · {cancelTarget.service}
            </p>
            <p className="mt-3 text-sm text-zinc-700">
              Use cancellation only for exceptional cases when rescheduling is not possible. The customer will receive a cancellation notification email.
            </p>
            {cancelTarget.paymentStatus === "paid" ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <strong>Deposit / Refund Policy:</strong> Because this booking is marked <strong>Paid</strong>, cancelling it will flag the payment for <strong>manual refund review</strong> in accordance with business policy. No automatic refund is triggered.
              </div>
            ) : null}
            <div className="mt-4">
              <label htmlFor="cancel-reason" className="block text-xs font-medium text-zinc-600">
                Cancellation Reason / Note for Customer (optional)
              </label>
              <textarea
                id="cancel-reason"
                rows={3}
                className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                placeholder="Reason for cancellation…"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
            {cancelError ? <p className="mt-3 text-sm text-red-600">{cancelError}</p> : null}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                onClick={() => setCancelTarget(null)}
                disabled={updatingId === cancelTarget.id}
              >
                Keep Booking
              </button>
              <button
                type="button"
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                onClick={() => void submitCancel()}
                disabled={updatingId === cancelTarget.id}
              >
                {updatingId === cancelTarget.id ? "Cancelling…" : "Confirm Cancellation"}
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
          Set the max number of consultation slots for a specific day (Africa/Accra).
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
              <table className="min-w-[1240px] w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-100">
                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900">
                      Requested (GMT)
                    </th>
                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900">
                      Customer
                    </th>
                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900">
                      Service &amp; Notes
                    </th>
                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900">
                      Preferred (GMT)
                    </th>
                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-900">
                      Scheduled / Proposed (GMT)
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
                  {filtered.map((b) => {
                    const isCancelledOrDeclined = b.status === "cancelled" || b.status === "declined";
                    return (
                      <tr key={b.id} className="align-top transition hover:bg-white/[0.07]">
                        <td className="px-5 py-4 text-sm text-zinc-700 whitespace-nowrap">
                          {formatCreatedAccra(b.createdAt)}
                        </td>
                        <td className="px-5 py-4 text-sm">
                          <div className="font-medium text-zinc-900">{b.customerName}</div>
                          <div className="text-zinc-800">{b.customerEmail}</div>
                          <div className="text-zinc-800">{b.customerPhone}</div>
                        </td>
                        <td className="px-5 py-4 text-sm text-zinc-800 max-w-[240px]">
                          <div className="font-medium text-zinc-900">{b.service}</div>
                          {b.notes ? (
                            <div className="mt-1 text-xs text-zinc-600 line-clamp-2" title={b.notes}>
                              Note: {b.notes}
                            </div>
                          ) : null}
                          {b.customerRescheduleResponse ? (
                            <div className="mt-2 rounded border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs text-blue-900">
                              <strong>Customer response:</strong> {b.customerRescheduleResponse}
                            </div>
                          ) : null}
                          {b.cancellationReason ? (
                            <div className="mt-2 rounded border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-900">
                              <strong>Cancel reason:</strong> {b.cancellationReason}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-5 py-4 text-sm text-zinc-800 whitespace-nowrap">
                          {formatPreferredSlotAccra(b.preferredDate, b.preferredTime)}
                        </td>
                        <td className="px-5 py-4 text-sm text-zinc-800">
                          {b.scheduledAt ? (
                            <div>
                              <span className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                                Confirmed:
                              </span>{" "}
                              <div className="font-medium text-zinc-900">
                                {formatConsultationAppointmentLocal(b.scheduledAt)}
                              </div>
                            </div>
                          ) : null}
                          {b.proposedScheduledAt ? (
                            <div className="mt-1 rounded border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
                              <div className="font-semibold">Proposed Reschedule:</div>
                              <div>{formatConsultationAppointmentLocal(b.proposedScheduledAt)}</div>
                              {b.rescheduleNote ? (
                                <div className="mt-0.5 text-amber-800">Note: {b.rescheduleNote}</div>
                              ) : null}
                            </div>
                          ) : null}
                          {!b.scheduledAt && !b.proposedScheduledAt ? <span>—</span> : null}
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
                                : b.status === "reschedule_proposed"
                                  ? "bg-blue-100 text-blue-900"
                                  : b.status === "confirmed"
                                    ? "bg-emerald-100 text-emerald-900"
                                    : "bg-zinc-100 text-zinc-600"
                            }`}
                          >
                            {b.status === "pending"
                              ? "Pending"
                              : b.status === "reschedule_proposed"
                                ? "Reschedule Proposed"
                                : b.status === "confirmed"
                                  ? "Confirmed"
                                  : b.status === "cancelled"
                                    ? "Cancelled"
                                    : "Declined"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                b.paymentStatus === "paid"
                                  ? "bg-emerald-100 text-emerald-900"
                                  : "bg-red-100 text-red-900"
                              }`}
                            >
                              {b.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                            </span>
                            {b.paymentRef ? (
                              <span className="text-[11px] font-mono text-zinc-600" title={b.paymentRef}>
                                {b.paymentRef}
                              </span>
                            ) : null}
                            {b.refundReviewRequired || (isCancelledOrDeclined && b.paymentStatus === "paid") ? (
                              <span className="inline-flex w-fit rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                                Refund Review Required
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm">
                          <div className="flex flex-col gap-2 min-w-[140px]">
                            {!isCancelledOrDeclined ? (
                              <>
                                {b.status !== "confirmed" ? (
                                  <button
                                    type="button"
                                    className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                                    disabled={updatingId === b.id}
                                    onClick={() => openConfirm(b)}
                                  >
                                    Confirm…
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
                                  disabled={updatingId === b.id}
                                  onClick={() => openReschedule(b)}
                                >
                                  Reschedule…
                                </button>
                                {b.status === "confirmed" ? (
                                  <button
                                    type="button"
                                    className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
                                    disabled={updatingId === b.id}
                                    onClick={() => openConsultationPrintWindow(b)}
                                  >
                                    Print slip
                                  </button>
                                ) : null}
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
                                <button
                                  type="button"
                                  className="mt-1 rounded-md border border-red-200 bg-white px-3 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                                  disabled={updatingId === b.id}
                                  onClick={() => setCancelTarget(b)}
                                >
                                  Cancel (Exceptional)
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-zinc-600">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
