import { PDFDocument } from "pdf-lib";
import type { DhlParcel } from "./dhlParcel";

function envTrim(name: string): string {
  return (process.env[name] || "").trim().replace(/^["']|["']$/g, "");
}

export const DHL_API_BASE = (
  envTrim("DHL_API_BASE_URL") || "https://express.api.dhl.com/mydhlapi/test"
).replace(/\/+$/, "");

function getAuthHeader() {
  const key = envTrim("DHL_API_KEY");
  const secret = envTrim("DHL_API_SECRET");
  if (!key || !secret) {
    throw new Error("DHL API credentials missing in environment (DHL_API_KEY or DHL_API_SECRET)");
  }
  return `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`;
}

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
    if (parts.length) return parts.join(" — ");
  } catch {
    /* not JSON */
  }
  const trimmed = body.replace(/\s+/g, " ").trim();
  return trimmed.slice(0, 400) || statusText;
}

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
        // Return on success or client error (no retry for 4xx)
        return response;
      }
      if (i === retries) return response; // Max retries reached
    } catch (err: any) {
      clearTimeout(id);
      if (i === retries) throw err; // Max retries reached
    }
    // Exponential backoff
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
    phone: "+233 24 409 3419",
    companyName: "JOEY THE BRAND",
    fullName: "JOSHUA OPPONG DARKO"
  }
};

function getNextBusinessDay() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  if (date.getDay() === 0) { // Sunday
    date.setDate(date.getDate() + 1);
  } else if (date.getDay() === 6) { // Saturday
    date.setDate(date.getDate() + 2);
  }
  return date.toISOString().split("T")[0];
}

export interface DHLShipmentRequest {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  destination: {
    addressLine1: string;
    region?: string;
    city: string;
    postalCode?: string;
    countryCode: string;
  };
  parcel: DhlParcel;
  customsLines: DhlCustomsLine[];
  itemDescription: string;
  freight: number;
}

export type DhlCustomsLine = {
  description: string;
  quantity: number;
  price: number;
  weightKg: number;
  hsCode: string;
  inboundHsCode?: string;
  grossWeightKg?: number;
};

export class DhlBookingRejected extends Error {}
export class DhlDocumentsIncomplete extends Error {}

async function shipmentPdf(
  documents: { typeCode?: string; content?: string }[],
  documentTypes: string[],
) {
  const label = documents.find((doc) => doc.typeCode === "label");
  if (!label?.content) throw new Error("DHL did not return a label.");
  const pdf = await PDFDocument.load(Buffer.from(label.content, "base64"));
  if (pdf.getPageCount() === documentTypes.length) return label.content;
  if (pdf.getPageCount() !== 1) throw new Error("Unexpected DHL label page count.");
  const combined = await PDFDocument.create();
  for (const type of documentTypes) {
    const content = documents.find((doc) => doc.typeCode === type)?.content;
    if (!content) throw new Error(`DHL did not return ${type}.`);
    const part = type === "label" ? pdf : await PDFDocument.load(Buffer.from(content, "base64"));
    if (part.getPageCount() !== 1) throw new Error(`Unexpected DHL ${type} page count.`);
    const [page] = await combined.copyPages(part, [0]);
    combined.addPage(page);
  }
  return combined.saveAsBase64();
}

type ShipmentRecipient = Pick<DHLShipmentRequest, "destination" | "customerName" | "customerEmail" | "customerPhone">;

function receiverDetails(req: ShipmentRecipient) {
  const countryCode = normalizeCountry(req.destination.countryCode);
  const postalCode = postalForDhl(countryCode, req.destination.postalCode);
  return {
    postalAddress: {
      cityName: req.destination.city.slice(0, 45),
      countryCode,
      addressLine1: req.destination.addressLine1.slice(0, 45),
      ...(req.destination.region && { countyName: req.destination.region.slice(0, 45) }),
      ...(postalCode && { postalCode }),
    },
    contactInformation: {
      email: req.customerEmail,
      phone: req.customerPhone,
      companyName: req.customerName.slice(0, 45),
      fullName: req.customerName.slice(0, 45),
    },
  };
}

function shipmentShipperDetails() {
  const address = SHIPPER_DETAILS.postalAddress;
  return {
    postalAddress: { ...address, postalCode: postalForDhl(address.countryCode, address.postalCode) },
    contactInformation: SHIPPER_DETAILS.contactInformation,
  };
}

export function parseDhlAddress(shippingAddress: string): DHLShipmentRequest["destination"] | null {
  if (typeof shippingAddress !== "string") return null;
  const address = shippingAddress.trim();
  // Older orders stored the display address, city, postal code and country only.
  const match = /\s+\| DHL\[([^|\]]+)\|([^|\]]*)\|([A-Z]{2})(?:\|([^|\]]*)(?:\|([^|\]]+))?)?\](?: \(international\))?$/i.exec(address);
  try {
    if (match) {
      const [, city, postalCode, countryCode, encodedStreet, encodedRegion] = match;
      const street = (encodedStreet ? decodeURIComponent(encodedStreet) : address.slice(0, match.index)).trim();
      if (!street || !city.trim()) return null;
      return {
        addressLine1: street,
        city: city.trim(),
        postalCode: postalCode.trim().toUpperCase(),
        countryCode: countryCode.toUpperCase(),
        ...(encodedRegion && { region: decodeURIComponent(encodedRegion).trim() }),
      };
    }

    if (address.startsWith("{")) {
      const parsed = JSON.parse(address);
      const street = String(parsed?.addressLine1 || parsed?.address || "").trim();
      if (street && typeof parsed?.city === "string" && parsed.city.trim() &&
        typeof parsed.countryCode === "string" && /^[A-Z]{2}$/i.test(parsed.countryCode.trim())) {
        return {
          addressLine1: street,
          city: parsed.city.trim(),
          postalCode: String(parsed.postalCode || "").trim().toUpperCase(),
          countryCode: normalizeCountry(parsed.countryCode),
          ...(typeof parsed.region === "string" && { region: parsed.region.trim() }),
        };
      }
    }
  } catch {
    return null;
  }
  return null;
}

export async function createShipment(req: DHLShipmentRequest) {
  const account = envTrim("DHL_ACCOUNT_NUMBER");
  if (!account || !envTrim("DHL_API_KEY") || !envTrim("DHL_API_SECRET")) throw new DhlBookingRejected("DHL credentials are missing.");

  const declaredValue = Math.round(req.customsLines.reduce((sum, line) => sum + line.price * line.quantity, 0) * 100) / 100;
  const countryCode = normalizeCountry(req.destination.countryCode);
  const isDomestic = countryCode === SHIPPER_DETAILS.postalAddress.countryCode;
  const documentTypes = isDomestic ? ["label", "waybillDoc"] : ["label", "waybillDoc", "invoice"];
  const description = req.itemDescription.slice(0, 70);

  const payload = {
    plannedShippingDateAndTime: dhlTimestamp(12),
    pickup: {
      isRequested: false // The user wants to manually schedule this later
    },
    productCode: isDomestic ? "N" : "P",
    accounts: [{ typeCode: "shipper", number: account }],
    outputImageProperties: {
      allDocumentsInOneImage: true,
      encodingFormat: "pdf",
      imageOptions: [
        { typeCode: "label", templateName: "ECOM26_84_A4_001", isRequested: true },
        { typeCode: "waybillDoc", templateName: "ARCH_8X4_A4_002", isRequested: true, hideAccountNumber: true },
        ...(!isDomestic ? [
          { typeCode: "invoice", templateName: "COMMERCIAL_INVOICE_P_10", isRequested: true, invoiceType: "commercial", languageCode: "eng" },
        ] : []),
      ]
    },
    customerDetails: {
      shipperDetails: shipmentShipperDetails(),
      receiverDetails: receiverDetails(req),
    },
    customerReferences: [{ value: req.orderId.slice(0, 35), typeCode: "CU" }],
    content: {
      unitOfMeasurement: "metric",
      packages: [
        {
          ...req.parcel,
          customerReferences: [{ value: req.orderId.substring(0, 35), typeCode: "CU" }],
          description,
        }
      ],
      isCustomsDeclarable: !isDomestic,
      incoterm: "DAP",
      ...(!isDomestic && {
        declaredValue: declaredValue,
        declaredValueCurrency: "GHS",
        exportDeclaration: {
          exportReason: "Permanent",
          exportReasonType: "permanent",
          shipmentType: "commercial",
          placeOfIncoterm: req.destination.city.slice(0, 45),
          ...(req.freight > 0 && { additionalCharges: [{ typeCode: "freight", value: req.freight }] }),
          lineItems: req.customsLines.map((line, index) => ({
            number: index + 1,
            description: line.description,
            price: line.price,
            quantity: { value: line.quantity, unitOfMeasurement: "PCS" },
            commodityCodes: [
              { typeCode: "outbound", value: line.hsCode },
              ...(line.inboundHsCode ? [{ typeCode: "inbound", value: line.inboundHsCode }] : []),
            ],
            exportReasonType: "permanent",
            manufacturerCountry: "GH",
            weight: { netValue: line.weightKg, grossValue: line.grossWeightKg ?? line.weightKg },
          })),
          invoice: {
            number: `INV-${req.orderId.substring(0, 20)}`,
            date: new Date().toISOString().split("T")[0]
          }
        },
      }),
      description,
    }
  };

  const res = await fetchWithRetry(`${DHL_API_BASE}/shipments`, {
    method: "POST",
    headers: dhlHeaders(),
    body: JSON.stringify(payload)
  }, 0);

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("DHL Shipment Error:", errorBody);
    const ErrorType = [400, 401, 403, 422].includes(res.status) ? DhlBookingRejected : Error;
    throw new ErrorType(`Failed to create DHL shipment: ${parseDhlError(errorBody, res.statusText)}`);
  }

  const data = await res.json();

  const trackingNumber = data.shipmentTrackingNumber;
  if (typeof trackingNumber !== "string" || !/^\d{10}$/.test(trackingNumber)) {
    throw new Error("DHL returned no valid waybill number.");
  }
  try {
    return { trackingNumber, labelData: await shipmentPdf(data.documents, documentTypes), declaredValue };
  } catch {
    throw new DhlDocumentsIncomplete(
      `DHL issued waybill ${trackingNumber}, but the ${documentTypes.length}-page PDF is incomplete. Reconcile the existing shipment with DHL before retrying.`,
    );
  }
}

export async function schedulePickup(trackingNumber: string, parcel: DhlParcel, recipient: ShipmentRecipient, declaredValue?: number) {
  const account = envTrim("DHL_ACCOUNT_NUMBER");
  if (!account || !envTrim("DHL_API_KEY") || !envTrim("DHL_API_SECRET")) throw new DhlBookingRejected("DHL credentials are missing.");
  const isCustomsDeclarable = declaredValue !== undefined;

  const payload = {
    plannedPickupDateAndTime: dhlTimestamp(10),
    closeTime: "16:00",
    location: "Reception",
    locationType: "business",
    accounts: [{ typeCode: "shipper" as const, number: account }],
    customerDetails: {
      shipperDetails: shipmentShipperDetails(),
      receiverDetails: receiverDetails(recipient),
    },
    shipmentDetails: [{
      shipmentTrackingNumber: trackingNumber,
      productCode: isCustomsDeclarable ? "P" : "N",
      unitOfMeasurement: "metric",
      isCustomsDeclarable,
      packages: [parcel],
      ...(isCustomsDeclarable && { declaredValue, declaredValueCurrency: "GHS" }),
    }]
  };

  const res = await fetchWithRetry(`${DHL_API_BASE}/pickups`, {
    method: "POST",
    headers: dhlHeaders(),
    body: JSON.stringify(payload)
  }, 0);

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("DHL Pickup Error:", errorBody);
    const ErrorType = [400, 401, 403, 422].includes(res.status) ? DhlBookingRejected : Error;
    throw new ErrorType(`Failed to schedule pickup: ${parseDhlError(errorBody, res.statusText)}`);
  }

  const data = await res.json();
  const confirmation = data.dispatchConfirmationNumbers?.[0];
  if (!confirmation) throw new Error("DHL returned no pickup confirmation. Check DHL before booking another pickup.");
  return {
    dispatchConfirmationNumber: confirmation
  };
}
