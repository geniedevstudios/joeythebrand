/** Customer-facing address. Order records keep the routing suffix for DHL. */
export function formatShippingAddress(raw: string): string {
  return raw
    .replace(/\s*\|\s*DHL\[[^\]]*\](?:\s*\(international\))?\s*$/i, "")
    .replace(/\s*\|\s*Custom(?:\s*\(international\))?\s*$/i, "")
    .trim();
}
