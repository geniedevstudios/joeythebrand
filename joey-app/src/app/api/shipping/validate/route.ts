import { NextResponse } from "next/server";
import { validateAddress } from "@/lib/dhl";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city");
    const postalCode = searchParams.get("postalCode");
    const countryCode = searchParams.get("countryCode");

    if (!city || !postalCode || !countryCode) {
      return NextResponse.json({ error: "Missing required parameters (city, postalCode, countryCode)" }, { status: 400 });
    }

    const data = await validateAddress({ city, postalCode, countryCode });
    return NextResponse.json(data);
  } catch (err) {
    console.error("Address validation error:", err);
    return NextResponse.json({ 
      error: "Failed to validate address", 
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}
