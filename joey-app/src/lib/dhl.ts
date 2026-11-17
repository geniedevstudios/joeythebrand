import { estimateShippingParcel } from "./shippingWeight";
import { DHL_TEST_API_BASE, resolveDhlEnvironment } from "./dhlRules";

function envTrim(name: string): string {
  return (process.env[name] || "").trim().replace(/^["']|["']$/g, "");
}

export const DHL_API_BASE = (
  envTrim("DHL_API_BASE_URL") || DHL_TEST_API_BASE
).replace(/\/+$/, "");

function dhlEnvironmentLabel(base: string) {
  return /\/test$/i.test(base) ? "TEST" : "PRODUCTION";
}

export function getDhlEnvironment() {
  return resolveDhlEnvironment(DHL_API_BASE, process.env);
}

function getAuthHeader() {
  getDhlEnvironment();
  const key = envTrim("DHL_API_KEY");
  const secret = envTrim("DHL_API_SECRET");
  if (!key || !secret) {
    throw new Error("DHL API credentials missing in environment (DHL_API_KEY or DHL_API_SECRET)");
  }
  return `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`;
}

/** MyDHL requires Message-Reference (min 28 chars) and HTTP-date Message-Reference-Date. */
function dhlHeaders(jsonBody = true): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: getAuthHeader(),
    "Message-Reference": crypto.randomUUID(),
    "Message-Reference-Date": new Date().toUTCString(),
  };
  if (jsonBody) headers["Content-Type"] = "application/json";
  return headers;
}

function parseDhlError(body: string, statusText: string): string {
  try {
    const parsed = JSON.parse(body) as {
      detail?: string;
      title?: string;
      message?: string;
      additionalDetails?: string[] | string;
      reasons?: { msg?: string; message?: string }[];
    };
    const reasonText = (parsed.reasons || [])
      .map((r) => r.msg || r.message)
      .filter(Boolean)
      .join("; ");
    const extra = Array.isArray(parsed.additionalDetails)
      ? parsed.additionalDetails.join("; ")
      : parsed.additionalDetails;
    const parts = [parsed.detail, parsed.title, parsed.message, reasonText, extra].filter(Boolean);
    if (parts.length) {
      const summary = parts.join(" — ");
      if (/unauthorized|invalid credentials/i.test(summary)) {
        const env = dhlEnvironmentLabel(DHL_API_BASE);
        return (
          `Unauthorized on DHL ${env} (${DHL_API_BASE}). ` +
          `Test keys only work with https://express.api.dhl.com/mydhlapi/test. ` +
          `Live keys only work with https://express.api.dhl.com/mydhlapi. ` +
          `Check DHL_API_KEY and DHL_API_SECRET for that environment. If using a .env file, escape literal dollar signs and quote values containing #.`
        );
      }
      return summary;
    }
  } catch {
    /* not JSON */
  }
  const trimmed = body.replace(/\s+/g, " ").trim();
  return trimmed.slice(0, 400) || statusText;
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 2, timeoutMs = 15000): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      if (i === retries) return response;
    } catch (err: unknown) {
      clearTimeout(id);
      if (i === retries) throw err;
    }
    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
  }
  throw new Error("Fetch failed after retries");
}

export const SHIPPER_DETAILS = {
  postalAddress: {
    postalCode: "GD-141-1647",
    cityName: "Accra",
    countyName: "Greater Accra",
    countryCode: "GH",
    addressLine1: "Nii KWAOFIO ST ASHALEY BOTWE"
  },
  contactInformation: {
    email: "joeythebrandonline@gmail.com",
    phone: "+233244093419",
    companyName: "JOEY THE BRAND",
    fullName: "JOSHUA OPPONG DARKO"
  }
};

export interface DHLRateRequest {
  destination: {
    city: string;
    postalCode?: string;
    countryCode: string;
    addressLine1?: string;
    region?: string;
  };
  weightKg: number;
  packageDimensions?: { length: number; width: number; height: number; };
}

function getNextBusinessDay() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  if (date.getDay() === 0) {
    date.setDate(date.getDate() + 1);
  } else if (date.getDay() === 6) {
    date.setDate(date.getDate() + 2);
  }
  return date.toISOString().split("T")[0];
}

/** DHL format is `YYYY-MM-DDTHH:MM:SSGMT+00:00` — no space before GMT. */
function dhlTimestamp(hour = 12) {
  const hh = String(hour).padStart(2, "0");
  return `${getNextBusinessDay()}T${hh}:00:00GMT+00:00`;
}

function normalizeCountry(code: string) {
  return code.trim().toUpperCase();
}

/** GhanaPost GPS (e.g. GD-141-1647) is not a DHL postal code. MyDHL still requires the key. */
function postalForDhl(countryCode: string, postalCode?: string): string | undefined {
  const country = normalizeCountry(countryCode);
  const trimmed = (postalCode || "").trim();
  if (country === "GH") {
    const isGps = /^[A-Z]{2}-/i.test(trimmed);
    if (trimmed && !isGps) return trimmed.slice(0, 12);
    return "00000";
  }
  return trimmed ? trimmed.slice(0, 12) : undefined;
}

function shipperRateAddress() {
  const countryCode = SHIPPER_DETAILS.postalAddress.countryCode;
  const postalCode = postalForDhl(countryCode, SHIPPER_DETAILS.postalAddress.postalCode);
  return {
    cityName: SHIPPER_DETAILS.postalAddress.cityName,
    countryCode,
    addressLine1: SHIPPER_DETAILS.postalAddress.addressLine1,
    countyName: SHIPPER_DETAILS.postalAddress.countyName,
    ...(postalCode ? { postalCode } : {}),
  };
}

export async function getShippingRates(req: DHLRateRequest) {
  const account = envTrim("DHL_ACCOUNT_NUMBER");
  if (!account) throw new Error("DHL Account Number not configured");

  const countryCode = normalizeCountry(req.destination.countryCode);
  const isDomestic = countryCode === SHIPPER_DETAILS.postalAddress.countryCode;
  const productCode = isDomestic ? "N" : "P";
  await validateAddress({ city: req.destination.city, postalCode: req.destination.postalCode ?? "", countryCode });
  const serviceName = isDomestic ? "DHL Express Domestic" : "DHL Express Worldwide";
  const postalCode = postalForDhl(countryCode, req.destination.postalCode);
  const addressLine1 = (req.destination.addressLine1 || req.destination.city).trim().slice(0, 45);

  const payload = {
    customerDetails: {
      shipperDetails: shipperRateAddress(),
      receiverDetails: {
        cityName: req.destination.city.substring(0, 45),
        countryCode,
        addressLine1,
        ...(req.destination.region && { countyName: req.destination.region.slice(0, 45) }),
        ...(postalCode ? { postalCode } : {}),
      }
    },
    accounts: [{ typeCode: "shipper" as const, number: account }],
    plannedShippingDateAndTime: dhlTimestamp(12),
    unitOfMeasurement: "metric",
    isCustomsDeclarable: !isDomestic,
    nextBusinessDay: true,
    productCode,
    packages: [estimateShippingParcel(req.weightKg, req.packageDimensions)]
  };

  const res = await fetchWithRetry(`${DHL_API_BASE}/rates`, {
    method: "POST",
    headers: dhlHeaders(),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("DHL Rates Error:", errorBody);
    throw new Error(`DHL Error: ${parseDhlError(errorBody, res.statusText)}`);
  }

  const data = await res.json();

  if (data.products && data.products.length > 0) {
    const product = data.products.find((p: { productCode?: string }) => p.productCode === productCode);
    if (!product) throw new Error(`${serviceName} is unavailable for this destination`);

    const priceObj = product.totalPrice?.find(
      (p: { priceCurrency?: string; price?: number }) =>
        p.priceCurrency === "GHS" && typeof p.price === "number" && Number.isFinite(p.price) && p.price > 0,
    );
    if (!priceObj) throw new Error(`${serviceName} did not return a valid GHS price`);
    return {
      price: Math.round(priceObj.price * 100) / 100,
      currency: priceObj.priceCurrency,
      productName: product.productName
    };
  }

  throw new Error("No shipping products available for this destination");
}

export async function trackShipment(trackingNumber: string) {
  const res = await fetchWithRetry(`${DHL_API_BASE}/shipments/${trackingNumber}/tracking?trackingView=all-checkpoints&levelOfDetail=all`, {
    method: "GET",
    headers: dhlHeaders(false),
  });

  if (res.status === 404) return { shipments: [] };
  if (!res.ok) {
    const errorBody = await res.text();
    console.error("DHL Tracking Error:", errorBody);

    throw new Error(`Failed to track shipment: ${parseDhlError(errorBody, res.statusText)}`);
  }

  return res.json();
}

export class DhlAddressRejected extends Error {}

export async function validateAddress({
  city,
  postalCode,
  countryCode
}: {
  city: string;
  postalCode: string;
  countryCode: string;
}) {
  const normalizedCountry = normalizeCountry(countryCode);
  const params = new URLSearchParams({
    type: "delivery",
    countryCode: normalizedCountry,
    cityName: city,
    strictValidation: "true",
  });
  const dhlPostal = postalForDhl(normalizedCountry, postalCode);
  if (dhlPostal) params.append("postalCode", dhlPostal);

  const res = await fetchWithRetry(`${DHL_API_BASE}/address-validate?${params}`, {
    method: "GET",
    headers: dhlHeaders(false),
  });

  if (res.status === 400 || res.status === 422) {
    throw new DhlAddressRejected("DHL could not verify the city and postal code. Check your delivery address.");
  }
  if (!res.ok) throw new Error("DHL address validation is temporarily unavailable.");

  const data = await res.json();
  if (!Array.isArray(data.address) || !data.address.length) {
    throw new DhlAddressRejected("DHL could not verify the city and postal code. Check your delivery address.");
  }
  return data;
}
