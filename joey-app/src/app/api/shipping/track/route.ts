import { NextResponse } from "next/server";
import { trackShipment } from "@/lib/dhl";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const trackingNumber = searchParams.get("trackingNumber");

    if (!trackingNumber) {
      return NextResponse.json({ error: "Missing trackingNumber parameter" }, { status: 400 });
    }

    const data = await trackShipment(trackingNumber);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Tracking error:", err);
    return NextResponse.json({ 
      error: "Failed to fetch tracking data", 
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}
