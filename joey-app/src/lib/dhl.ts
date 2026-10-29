function envTrim(name: string): string {
  return (process.env[name] || "").trim().replace(/^["']|["']$/g, "");
}

export const DHL_API_BASE = (
  envTrim("DHL_API_BASE_URL") || "https://express.api.dhl.com/mydhlapi/test"
).replace(/\/+$/, "");

function dhlEnvironmentLabel(base: string) {
  return /\/test$/i.test(base) ? "TEST" : "PRODUCTION";
}

function getAuthHeader() {
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
          `Re-copy DHL_API_KEY and DHL_API_SECRET from developer.dhl.com (no quotes or spaces) and match DHL_API_BASE_URL to that same environment.`
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

export interface DHLRateRequest {
  destination: {
    city: string;
    postalCode?: string;
    countryCode: string;
    addressLine1?: string;
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

/** GhanaPost GPS (GD-141-1647) is not a DHL postal code and causes 400s. */
function postalForDhl(countryCode: string, postalCode?: string): string | undefined {
  const trimmed = (postalCode || "").trim();
  if (!trimmed) return undefined;
  if (normalizeCountry(countryCode) === "GH") return undefined;
  return trimmed.slice(0, 12);
}

function shipperRateAddress() {
  const countryCode = SHIPPER_DETAILS.postalAddress.countryCode;
  const postalCode = postalForDhl(countryCode, SHIPPER_DETAILS.postalAddress.postalCode);
  return {
    cityName: SHIPPER_DETAILS.postalAddress.cityName,
    countryCode,
    addressLine1: SHIPPER_DETAILS.postalAddress.addressLine1,
    ...(postalCode ? { postalCode } : {}),
  };
}

export async function getShippingRates(req: DHLRateRequest) {
  const account = envTrim("DHL_ACCOUNT_NUMBER");
  if (!account) throw new Error("DHL Account Number not configured");

  const countryCode = normalizeCountry(req.destination.countryCode);
  const postalCode = postalForDhl(countryCode, req.destination.postalCode);
  const addressLine1 = (req.destination.addressLine1 || req.destination.city).trim().slice(0, 45);

  const payload = {
    customerDetails: {
      shipperDetails: shipperRateAddress(),
      receiverDetails: {
        cityName: req.destination.city.substring(0, 45),
        countryCode,
        addressLine1,
        ...(postalCode ? { postalCode } : {}),
      }
    },
    accounts: [{ typeCode: "shipper" as const, number: account }],
    plannedShippingDateAndTime: dhlTimestamp(12),
    unitOfMeasurement: "metric",
    isCustomsDeclarable: true,
    nextBusinessDay: true,
    monetaryAmount: [
      { typeCode: "declaredValue", value: 100, currency: "GHS" }
    ],
    packages: [
      {
        weight: Math.max(0.5, Number(req.weightKg) || 0.5),
        dimensions: req.packageDimensions || { length: 30, width: 20, height: 10 }
      }
    ]
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
    const product = data.products.find((p: { productCode?: string }) => p.productCode === "P") || data.products[0];
    const priceObj = product.totalPrice.find((p: { priceCurrency?: string }) => p.priceCurrency === "GHS") || product.totalPrice[0];
    return {
      price: priceObj.price,
      currency: priceObj.priceCurrency,
      productName: product.productName
    };
  }

  throw new Error("No shipping products available for this destination");
}

export interface DHLShipmentRequest {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  destination: {
    addressLine1: string;
    city: string;
    postalCode?: string;
    countryCode: string;
  };
  items: {
    name: string;
    quantity: number;
    price: number;
    weightKg: number;
    hsCode: string;
  }[];
  packageDimensions?: { length: number; width: number; height: number; };
}

export async function createShipment(req: DHLShipmentRequest) {
  const account = envTrim("DHL_ACCOUNT_NUMBER");
  if (!account) throw new Error("DHL Account Number not configured");

  const totalWeight = req.items.reduce((acc, item) => acc + (item.weightKg * item.quantity), 0) || 1.0;
  const declaredValue = req.items.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 100;
  const countryCode = normalizeCountry(req.destination.countryCode);
  const postalCode = postalForDhl(countryCode, req.destination.postalCode);
  const shipperPostal = postalForDhl(
    SHIPPER_DETAILS.postalAddress.countryCode,
    SHIPPER_DETAILS.postalAddress.postalCode,
  );

  const payload = {
    plannedShippingDateAndTime: dhlTimestamp(12),
    pickup: {
      isRequested: false
    },
    productCode: "P",
    accounts: [{ typeCode: "shipper" as const, number: account }],
    outputImageProperties: {
      allDocumentsInOneImage: true,
      encodingFormat: "pdf",
      imageOptions: [
        { typeCode: "label", templateName: "ECOM26_84_A4_001", isRequested: true },
        { typeCode: "waybillDoc", templateName: "ARCH_8x4", isRequested: true },
        { typeCode: "invoice", templateName: "COMMERCIAL_INVOICE_P_10", isRequested: true, invoiceType: "commercial" }
      ]
    },
    customerDetails: {
      shipperDetails: {
        postalAddress: {
          cityName: SHIPPER_DETAILS.postalAddress.cityName,
          countryCode: SHIPPER_DETAILS.postalAddress.countryCode,
          addressLine1: SHIPPER_DETAILS.postalAddress.addressLine1,
          ...(shipperPostal ? { postalCode: shipperPostal } : {}),
        },
        contactInformation: SHIPPER_DETAILS.contactInformation,
      },
      receiverDetails: {
        postalAddress: {
          cityName: req.destination.city.substring(0, 45),
          countryCode,
          addressLine1: req.destination.addressLine1.substring(0, 45),
          ...(postalCode ? { postalCode } : {}),
        },
        contactInformation: {
          email: req.customerEmail || "customer@example.com",
          phone: (req.customerPhone || "0000000000").substring(0, 25),
          companyName: req.customerName.substring(0, 45),
          fullName: req.customerName.substring(0, 45)
        }
      }
    },
    content: {
      unitOfMeasurement: "metric",
      incoterm: "DAP",
      packages: [
        {
          weight: totalWeight,
          dimensions: req.packageDimensions || { length: 30, width: 20, height: 10 },
          customerReferences: [{ value: req.orderId.substring(0, 35), typeCode: "CU" }],
          description: "Clothing apparel"
        }
      ],
      isCustomsDeclarable: true,
      declaredValue: declaredValue,
      declaredValueCurrency: "GHS",
      exportDeclaration: {
        lineItems: req.items.map((item, index) => {
          if (!item.hsCode) throw new Error(`Item "${item.name}" is missing an HS Code. Please add it to the product before shipping.`);
          return {
            number: index + 1,
            description: item.name.substring(0, 45),
            price: item.price || 0,
            quantity: { value: item.quantity || 1, unitOfMeasurement: "EA" },
            commodityCodes: [{ typeCode: "outbound", value: item.hsCode }],
            exportReasonType: "permanent",
            manufacturerCountry: "GH",
            weight: { netValue: item.weightKg || 0.5, grossValue: item.weightKg || 0.5 }
          };
        }),
        invoice: {
          number: `INV-${req.orderId.substring(0, 20)}`,
          date: new Date().toISOString().split("T")[0]
        }
      },
      description: "Clothing and Apparel"
    }
  };

  const res = await fetchWithRetry(`${DHL_API_BASE}/shipments`, {
    method: "POST",
    headers: dhlHeaders(),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("DHL Shipment Error:", errorBody);
    throw new Error(`Failed to create DHL shipment: ${parseDhlError(errorBody, res.statusText)}`);
  }

  const data = await res.json();

  return {
    trackingNumber: data.shipmentTrackingNumber,
    labelData: data.documents?.[0]?.content
  };
}

export async function schedulePickup(trackingNumber: string, weight: number = 0.5, dimensions: { length: number; width: number; height: number; } = { length: 30, width: 20, height: 10 }) {
  const account = envTrim("DHL_ACCOUNT_NUMBER");
  if (!account) throw new Error("DHL Account Number not configured");

  const shipperPostal = postalForDhl(
    SHIPPER_DETAILS.postalAddress.countryCode,
    SHIPPER_DETAILS.postalAddress.postalCode,
  );

  const payload = {
    plannedPickupDateAndTime: dhlTimestamp(10),
    closeTime: "16:00",
    location: "Reception",
    locationType: "business",
    accounts: [{ typeCode: "shipper" as const, number: account }],
    customerDetails: {
      shipperDetails: {
        postalAddress: {
          cityName: SHIPPER_DETAILS.postalAddress.cityName,
          countryCode: SHIPPER_DETAILS.postalAddress.countryCode,
          addressLine1: SHIPPER_DETAILS.postalAddress.addressLine1,
          ...(shipperPostal ? { postalCode: shipperPostal } : {}),
        },
        contactInformation: SHIPPER_DETAILS.contactInformation,
      }
    },
    shipmentDetails: [{
      shipmentTrackingNumber: trackingNumber,
      unitOfMeasurement: "metric",
      isCustomsDeclarable: true,
      packages: [{ typeCode: "3BX", weight, dimensions }],
      declaredValue: 100,
      declaredValueCurrency: "GHS"
    }]
  };

  const res = await fetchWithRetry(`${DHL_API_BASE}/pickups`, {
    method: "POST",
    headers: dhlHeaders(),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("DHL Pickup Error:", errorBody);
    throw new Error(`Failed to schedule pickup: ${parseDhlError(errorBody, res.statusText)}`);
  }

  const data = await res.json();
  return {
    dispatchConfirmationNumber: data.dispatchConfirmationNumbers?.[0]
  };
}

export async function trackShipment(trackingNumber: string) {
  const res = await fetchWithRetry(`${DHL_API_BASE}/shipments/${trackingNumber}/tracking`, {
    method: "GET",
    headers: dhlHeaders(false),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("DHL Tracking Error:", errorBody);

    if (res.status === 500 && process.env.NODE_ENV === "development" && DHL_API_BASE.includes("test")) {
      return { shipments: [] };
    }

    throw new Error(`Failed to track shipment: ${parseDhlError(errorBody, res.statusText)}`);
  }

  return res.json();
}

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
    cityName: city
  });
  const dhlPostal = postalForDhl(normalizedCountry, postalCode);
  if (dhlPostal) params.append("postalCode", dhlPostal);

  try {
    const res = await fetchWithRetry(`${DHL_API_BASE}/address-validate?${params.toString()}`, {
      method: "GET",
      headers: dhlHeaders(false),
    });

    if (res.status === 405 || res.status === 404) {
      console.warn("DHL address-validate not available (test env). Skipping validation.");
      return { warnings: [], address: [] };
    }

    if (!res.ok) {
      const errorBody = await res.text();
      console.error("DHL Address Validate Error:", errorBody);
      throw new Error(`Failed to validate address: ${parseDhlError(errorBody, res.statusText)}`);
    }

    return res.json();
  } catch (err) {
    console.warn("Address validation unavailable, skipping:", err);
    return { warnings: [], address: [] };
  }
}
