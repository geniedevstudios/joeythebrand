import { NextResponse } from "next/server";
import { getShippingRates } from "@/lib/dhl";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { destination, items } = body;

    if (!destination || !destination.countryCode || !destination.city) {
      return NextResponse.json({ error: "Missing destination country or city" }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided for shipping calculation" }, { status: 400 });
    }

    // Calculate total weight based on items (or fallback to 0.5kg per item)
    let totalWeight = 0;
    for (const item of items) {
      totalWeight += (item.weightKg || 0.5) * (item.quantity || 1);
    }

    const rateResult = await getShippingRates({
      destination: {
        city: destination.city,
        postalCode: destination.postalCode,
        countryCode: String(destination.countryCode || "").toUpperCase(),
        addressLine1: destination.addressLine1 || destination.city,
      },
      weightKg: totalWeight
    });

    return NextResponse.json(rateResult);
  } catch (err) {
    console.error("Shipping Rate Error:", err);
    return NextResponse.json({ 
      error: "Failed to calculate shipping rate", 
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}
