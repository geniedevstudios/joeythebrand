import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { DhlAddressRejected, getShippingRates } from "@/lib/dhl";
import { garmentWeightKg } from "@/lib/shippingWeight";

export const runtime = "nodejs";

type QuoteItem = { productId?: string; weightKg?: number; quantity: number };

export async function POST(req: Request) {
  try {
    const { destination, items } = await req.json() as {
      destination?: { countryCode: string; city: string; addressLine1?: string; postalCode?: string; region?: string };
      items?: QuoteItem[];
    };

    if (!destination || typeof destination.countryCode !== "string" ||
      typeof destination.city !== "string" || !destination.city.trim() ||
      !/^[a-z]{2}$/i.test(destination.countryCode) ||
      [destination.addressLine1, destination.postalCode, destination.region].some((field) => field != null && typeof field !== "string")) {
      return NextResponse.json({ error: "Missing or invalid destination country or city" }, { status: 400 });
    }
    if (!Array.isArray(items) || !items.length || items.some((item) =>
      !item || !Number.isSafeInteger(item.quantity) || item.quantity < 1)) {
      return NextResponse.json({ error: "Provide items with valid quantities" }, { status: 400 });
    }

    const ids = [...new Set(items.map((item) => item.productId).filter((id): id is string => typeof id === "string" && !!id))];
    const weights = new Map<string, number>();
    if (ids.length) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const { data, error } = await supabase.from("products").select("id, weight_kg").in("id", ids);
      if (error) throw error;
      if (data.length !== ids.length) {
        return NextResponse.json({ error: "A cart item is no longer available for a DHL quote" }, { status: 400 });
      }
      for (const product of data) weights.set(product.id, garmentWeightKg(product.weight_kg));
    }

    const weightKg = items.reduce((sum, item) =>
      sum + (weights.get(item.productId || "") ?? garmentWeightKg(item.weightKg)) * item.quantity, 0);
    const rate = await getShippingRates({
      destination: {
        city: destination.city.trim(),
        postalCode: destination.postalCode,
        region: destination.region?.trim(),
        countryCode: destination.countryCode.toUpperCase(),
        addressLine1: destination.addressLine1 || destination.city,
      },
      weightKg,
    });
    return NextResponse.json(rate);
  } catch (error) {
    if (error instanceof DhlAddressRejected) {
      return NextResponse.json({ code: "ADDRESS_REJECTED", error: error.message }, { status: 422 });
    }
    console.error("Shipping rate error:", error);
    return NextResponse.json({
      error: "Failed to calculate shipping rate",
      details: error instanceof Error ? error.message : "Shipping quote unavailable",
    }, { status: 500 });
  }
}
