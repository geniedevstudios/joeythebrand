export type ShippingDisplay = {
  address: string;
  carrier: "dhl" | "custom" | "other";
  international: boolean;
};

/** Strip DHL/Custom machine suffixes so admins see a readable address. */
export function parseShippingAddressDisplay(raw: string | undefined | null): ShippingDisplay {
  let address = (raw || "").trim();
  let carrier: ShippingDisplay["carrier"] = "other";
  let international = false;

  const dhlMatch = /\s*\|\s*DHL\[[^\]]*\](?:\s*\(international\))?$/i.exec(address);
  if (dhlMatch) {
    carrier = "dhl";
    international = /\(international\)\s*$/i.test(dhlMatch[0]);
    address = address.slice(0, dhlMatch.index).trim();
  } else {
    const customMatch = /\s*\|\s*Custom(?:\s*\(international\))?$/i.exec(address);
    if (customMatch) {
      carrier = "custom";
      international = /\(international\)\s*$/i.test(customMatch[0]);
      address = address.slice(0, customMatch.index).trim();
    } else if (/\(international\)\s*$/i.test(address)) {
      international = true;
      address = address.replace(/\s*\(international\)\s*$/i, "").trim();
    }
  }

  try {
    if (/%[0-9A-Fa-f]{2}/.test(address)) {
      address = decodeURIComponent(address);
    }
  } catch {
    // keep original if decoding fails
  }

  return { address: address || "—", carrier, international };
}

export function isDhlShippingAddress(raw: string | undefined | null): boolean {
  return parseShippingAddressDisplay(raw).carrier === "dhl";
}
