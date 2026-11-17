import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { dhlEnvironmentMatches } from "@/lib/dhlRules";
import { getDhlEnvironment, trackShipment } from "@/lib/dhl";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const trackingNumber = searchParams.get("trackingNumber");

    if (!trackingNumber || !/^\d{10}$/.test(trackingNumber)) {
      return NextResponse.json({ error: "Enter a valid DHL waybill number" }, { status: 400 });
    }

    const active = getDhlEnvironment();
    if (active.explicit) {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { data: order, error } = await supabase.from("orders").select("dhl_environment")
        .eq("dhl_tracking_number", trackingNumber).maybeSingle();
      if (error || !order || !dhlEnvironmentMatches(order.dhl_environment, active)) {
        return NextResponse.json({ shipments: [] });
      }
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
