/** Strip control chars and trim; keeps newlines in message only where allowed. */
export function sanitizeSingleLine(input: string, maxLen: number): string {
  const s = input
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, maxLen);
  return s;
}

export function sanitizeMessage(input: string, maxLen: number): string {
  return input
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, maxLen);
}
