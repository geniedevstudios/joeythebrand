import { quoteMeasuredParcel, type DHLShipmentRequest } from "./dhl";
import type { DhlParcel } from "./dhlParcel";

export function shippingCostForDhl(value: unknown, isExport: boolean) {
  const price = Number(value ?? 0);
  if (!Number.isFinite(price) || price < 0 || (isExport && price <= 0)) return null;
  return price;
}

export async function measuredParcelFreight(destination: DHLShipmentRequest["destination"], parcel: DhlParcel) {
  try {
    return await quoteMeasuredParcel(destination, parcel);
  } catch (error) {
    console.warn("DHL packed-parcel quote unavailable:", error);
    return null;
  }
}
