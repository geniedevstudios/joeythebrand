import type { ConsultationBooking } from "@/lib/types";
import { formatConsultationAppointmentLocal } from "@/lib/formatConsultationAppointment";

function escapeHtml(s: string): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPreferred(dateIso?: string, time24?: string) {
  if (!dateIso?.trim()) return "—";
  const d = new Date(dateIso.length === 10 ? `${dateIso}T12:00:00` : dateIso);
  const dateLabel = Number.isNaN(d.getTime())
    ? dateIso
    : d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
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
  return formatConsultationAppointmentLocal(iso.trim());
}

/** Print-friendly consultation slip from the admin dashboard. */
export function openConsultationPrintWindow(b: ConsultationBooking): void {
  const statusLabel =
    b.status === "pending"
      ? "Pending review"
      : b.status === "reschedule_proposed"
        ? "Reschedule proposed"
        : b.status === "confirmed"
          ? "Confirmed"
          : b.status === "cancelled"
            ? "Cancelled"
            : "Declined";

  const pairs: { label: string; value: string; mono?: boolean }[] = [
    { label: "Channel", value: b.source === "portfolio" ? "Portfolio site" : "Shop (app)" },
    { label: "Customer name", value: b.customerName },
    { label: "Email", value: b.customerEmail },
    { label: "Phone / WhatsApp", value: b.customerPhone },
    { label: "Service", value: b.service },
    { label: "Preferred slot", value: formatPreferred(b.preferredDate, b.preferredTime) },
    { label: "Scheduled appointment", value: formatScheduled(b.scheduledAt) },
    { label: "Booking code", value: b.bookingCode || "—", mono: true },
    { label: "Status", value: statusLabel },
    { label: "Customer notes", value: b.notes?.trim() || "—" },
  ];

  const tableRows = pairs
    .map(
      ({ label, value, mono }) =>
        `<tr><th>${escapeHtml(label)}</th><td class="${mono ? "mono" : ""}">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  const title = `Appointment — ${b.bookingCode || "Consultation"}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,500;0,600;0,700;1,400&amp;display=swap" rel="stylesheet"/>
  <style>
    @page { margin: 14mm; size: A4; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 12px;
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1a1a1a;
      line-height: 1.45;
      background: #f4f4f5;
    }
    .sheet { max-width: 640px; margin: 0 auto; }
    .machine {
      border: 3px solid #272B36;
      border-radius: 10px;
      overflow: hidden;
      background: #fff;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    .machine-top {
      display: flex;
      align-items: center;
      gap: 32px;
      padding: 18px 22px;
      background: linear-gradient(135deg, #272B36 0%, #4a5568 100%);
      color: #fff;
    }
    .logo-mark {
      flex-shrink: 0;
      font-family: "Bodoni Moda", "Bodoni MT", Didot, Georgia, serif;
      font-size: 2.35rem;
      font-weight: 500;
      letter-spacing: -0.02em;
      line-height: 1;
      color: #fff;
    }
    .top-copy {
      min-width: 0;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
      justify-content: center;
      padding-left: 12px;
      border-left: 1px solid rgba(255, 255, 255, 0.22);
      margin-left: 4px;
    }
    .brand-line {
      font-size: 0.98rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      line-height: 1.35;
      color: #fff;
    }
    .sub {
      font-size: 0.72rem;
      font-weight: 400;
      opacity: 0.88;
      letter-spacing: 0.04em;
      max-width: 340px;
      line-height: 1.45;
    }
    .perforation {
      height: 8px;
      background: repeating-linear-gradient(90deg, #272B36 0px, #272B36 5px, transparent 5px, transparent 10px);
      opacity: 0.35;
    }
    .body { padding: 18px 20px 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 10.5pt; }
    th {
      text-align: left;
      vertical-align: top;
      width: 34%;
      padding: 9px 10px 9px 0;
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #616F84;
      border-bottom: 1px solid #e4e4e7;
    }
    td {
      padding: 9px 0;
      border-bottom: 1px solid #e4e4e7;
      word-break: break-word;
    }
    tr:last-child th, tr:last-child td { border-bottom: none; }
    td.mono {
      font-family: ui-monospace, Consolas, monospace;
      font-weight: 700;
      font-size: 11pt;
      letter-spacing: 0.05em;
    }
    .footer {
      padding: 14px 20px 18px;
      font-size: 8.5pt;
      color: #71717a;
      text-align: center;
      border-top: 2px dashed #d4d4d8;
      line-height: 1.5;
    }
    .hint { margin-top: 6px; color: #52525b; }
    @media print {
      body { background: #fff; padding: 0; }
      .sheet { max-width: none; }
      .machine { box-shadow: none; border-width: 2px; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="machine">
      <div class="machine-top">
        <div class="logo-mark" aria-hidden="true">JOEY</div>
        <div class="top-copy">
          <div class="brand-line">JOEY The brand</div>
          <div class="sub">Consultation slip — admin copy (print or save as PDF).</div>
        </div>
      </div>
      <div class="perforation" aria-hidden="true"></div>
      <div class="body">
        <table>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
      <div class="footer">
        Joey admin · ${escapeHtml(new Date().toLocaleString())}
        <div class="hint">Ctrl+P (Windows) or ⌘+P (Mac) → Save as PDF or print</div>
      </div>
    </div>
  </div>
  <script>
    window.onload = function () {
      setTimeout(function () {
        window.focus();
        window.print();
      }, 200);
    };
  </script>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (!w) {
    URL.revokeObjectURL(url);
    window.alert(
      "Your browser blocked the print window. Allow pop-ups for this site, then tap Print / PDF again.",
    );
    return;
  }
  const revoke = () => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  };
  if (w.document.readyState === "complete") {
    revoke();
  } else {
    w.addEventListener("load", revoke, { once: true });
  }
}
