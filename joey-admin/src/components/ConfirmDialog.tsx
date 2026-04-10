"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** default = dark primary; danger = red (destructive) */
  variant?: "default" | "danger";
  onCancel: () => void;
  /** Return a Promise; errors are shown in the dialog until dismissed or retried */
  onConfirm: () => void | Promise<void>;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onCancel,
  onConfirm,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (open) {
      setActionError("");
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  const handleConfirm = async () => {
    setActionError("");
    setBusy(true);
    try {
      await onConfirm();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.04]"
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <h2 id="confirm-dialog-title" className="pr-8 text-xl font-semibold tracking-tight text-zinc-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="-mr-1 -mt-1 shrink-0 rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
        {description && (
          <div className="mt-4 px-6">
            <div className="rounded-xl border border-zinc-100 bg-gradient-to-b from-stone-50 to-zinc-50/80 px-4 py-4 text-sm leading-relaxed text-zinc-700 shadow-inner shadow-zinc-100/50">
              {description}
            </div>
          </div>
        )}
        {actionError && (
          <div className="mt-4 px-6">
            <p className="rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-800">{actionError}</p>
          </div>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-zinc-100 bg-zinc-50/50 px-6 py-4 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={busy}
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50 ${
              variant === "danger"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-zinc-950 hover:bg-zinc-800"
            }`}
          >
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
