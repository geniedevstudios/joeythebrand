export const DHL_API_BASE = process.env.DHL_API_BASE_URL || "https://express.api.dhl.com/mydhlapi/test";

function getAuthHeader() {
  const key = process.env.DHL_API_KEY;
  const secret = process.env.DHL_API_SECRET;
  if (!key || !secret) {
    throw new Error("DHL API credentials missing in environment (DHL_API_KEY or DHL_API_SECRET)");
  }
  return `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`;
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
  };
  weightKg: number;
  packageDimensions?: { length: number; width: number; height: number; };
}

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

export async function getShippingRates(req: DHLRateRequest) {
  const account = process.env.DHL_ACCOUNT_NUMBER;
  if (!account) throw new Error("DHL Account Number not configured");

  const plannedShippingDate = getNextBusinessDay();

  const payload = {
    customerDetails: {
      shipperDetails: {
        postalCode: SHIPPER_DETAILS.postalAddress.postalCode,
        cityName: SHIPPER_DETAILS.postalAddress.cityName,
        countryCode: SHIPPER_DETAILS.postalAddress.countryCode,
        addressLine1: SHIPPER_DETAILS.postalAddress.addressLine1
      },
      receiverDetails: {
        postalCode: req.destination.postalCode || "",
        cityName: req.destination.city.substring(0, 45),
        countryCode: req.destination.countryCode
      }
    },
    accounts: [{ typeCode: "shipper", number: account }],
    productCode: "P",
    plannedShippingDateAndTime: `${plannedShippingDate}T12:00:00 GMT+00:00`,
    unitOfMeasurement: "metric",
    isCustomsDeclarable: true,
    monetaryAmount: [
      { typeCode: "declaredValue", value: 100, currency: "GHS" }
    ],
    packages: [
      {
        weight: req.weightKg || 1.0,
        dimensions: req.packageDimensions || { length: 30, width: 20, height: 10 }
      }
    ]
  };

  const res = await fetchWithRetry(`${DHL_API_BASE}/rates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
      Connection: "close",
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("DHL Rates Error:", errorBody);
    let errorDetail = res.statusText;
    try {
      const parsed = JSON.parse(errorBody);
      if (parsed.detail) errorDetail = parsed.detail;
      else if (parsed.message) errorDetail = parsed.message;
    } catch (e) { }
    throw new Error(`DHL Error: ${errorDetail}`);
  }

  const data = await res.json();

  if (data.products && data.products.length > 0) {
    const product = data.products.find((p: any) => p.productCode === "P") || data.products[0];
    const priceObj = product.totalPrice.find((p: any) => p.priceCurrency === "GHS") || product.totalPrice[0];
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
  const account = process.env.DHL_ACCOUNT_NUMBER;
  if (!account) throw new Error("DHL Account Number not configured");

  const plannedShippingDate = getNextBusinessDay();

  const totalWeight = req.items.reduce((acc, item) => acc + (item.weightKg * item.quantity), 0) || 1.0;
  const declaredValue = req.items.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 100;

  const payload = {
    plannedShippingDateAndTime: `${plannedShippingDate}T12:00:00 GMT+00:00`,
    pickup: {
      isRequested: false // The user wants to manually schedule this later
    },
    productCode: "P",
    accounts: [{ typeCode: "shipper", number: account }],
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
      shipperDetails: SHIPPER_DETAILS,
      receiverDetails: {
        postalAddress: {
          postalCode: req.destination.postalCode || "",
          cityName: req.destination.city.substring(0, 45),
          countryCode: req.destination.countryCode,
          addressLine1: req.destination.addressLine1.substring(0, 45)
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
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
      Connection: "close",
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("DHL Shipment Error:", errorBody);
    throw new Error(`Failed to create DHL shipment: ${res.statusText} - ${errorBody}`);
  }

  const data = await res.json();

  // Return tracking number and base64 label
  return {
    trackingNumber: data.shipmentTrackingNumber,
    labelData: data.documents?.[0]?.content // base64 encoded PDF
  };
}

export async function schedulePickup(trackingNumber: string, weight: number = 0.5, dimensions: { length: number; width: number; height: number; } = { length: 30, width: 20, height: 10 }) {
  const account = process.env.DHL_ACCOUNT_NUMBER;
  if (!account) throw new Error("DHL Account Number not configured");

  const pickupDate = getNextBusinessDay();

  const payload = {
    plannedPickupDateAndTime: `${pickupDate}T10:00:00 GMT+00:00`,
    closeTime: "16:00",
    location: "Reception",
    locationType: "business",
    accounts: [{ typeCode: "shipper", number: account }],
    customerDetails: {
      shipperDetails: SHIPPER_DETAILS
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
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
      Connection: "close",
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("DHL Pickup Error:", errorBody);
    throw new Error(`Failed to schedule pickup: ${res.statusText} - ${errorBody}`);
  }

  const data = await res.json();
  return {
    dispatchConfirmationNumber: data.dispatchConfirmationNumbers?.[0]
  };
}

export async function trackShipment(trackingNumber: string) {
  const res = await fetchWithRetry(`${DHL_API_BASE}/shipments/${trackingNumber}/tracking`, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      Authorization: getAuthHeader(),
      Connection: "close",
    }
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("DHL Tracking Error:", errorBody);

    // Fallback for DHL Test API 500 errors (which happen right after test labels are created)
    if (res.status === 500 && DHL_API_BASE.includes("test")) {
      return {
        shipments: [
          {
            id: trackingNumber,
            service: "EXPRESS WORLDWIDE",
            events: [
              {
                date: new Date().toISOString().split("T")[0],
                time: "10:00:00",
                description: "Shipment information received",
                location: { address: { addressLocality: "Accra" } }
              },
              {
                date: new Date().toISOString().split("T")[0],
                time: "14:30:00",
                description: "Processed at DHL Sort Facility",
                location: { address: { addressLocality: "Accra" } }
              }
            ]
          }
        ]
      };
    }

    throw new Error(`Failed to track shipment: ${res.statusText}`);
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
  const params = new URLSearchParams({
    type: "delivery",
    countryCode,
    cityName: city,
    postalCode
  });

  const res = await fetchWithRetry(`${DHL_API_BASE}/address-validate?${params.toString()}`, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      Authorization: getAuthHeader(),
      Connection: "close",
    }
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("DHL Address Validate Error:", errorBody);
    throw new Error(`Failed to validate address: ${res.statusText}`);
  }

  return res.json();
}
