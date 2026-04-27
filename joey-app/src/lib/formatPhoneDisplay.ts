export function formatPhoneDisplay(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";

  const digitsOnly = s.replace(/[^\d+]/g, "");

  // International Ghana numbers: +2330XXXXXXXXX → +233XXXXXXXXX
  // Also handles "+233 (0) ..." formats.
  if (digitsOnly.startsWith("+233")) {
    // "+233050..." -> "+23350..."
    const normalized = digitsOnly.replace(/^\+2330+/, "+233");
    const national = normalized.replace(/^\+233/, "");

    // Typical Ghana mobile: +233 + 9 digits -> +233 XX XXX XXXX
    if (/^\d{9}$/.test(national)) {
      return `+233 ${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`;
    }

    return normalized;
  }

  // Preserve other international formats as-is.
  if (s.startsWith("+")) return s;

  // Remove a leading 0 for local numbers (e.g. 050... -> 50...).
  const local = digitsOnly.replace(/^0+/, "");
  // 9-digit local (after stripping 0): 50 414 8009
  if (/^\d{9}$/.test(local)) {
    return `${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
  }
  return local || s.replace(/^0+/, "");
}

