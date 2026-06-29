import { NextResponse } from "next/server";
import { schedulePickup } from "@/lib/dhl";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, trackingNumber } = body;

    if (!orderId || !trackingNumber) {
      return NextResponse.json({ error: "Missing orderId or trackingNumber" }, { status: 400 });
    }

    const pickupRes = await schedulePickup(trackingNumber);

    // Update order status in DB
    const { error } = await supabaseAdmin
      .from("orders")
      .update({
        status: "shipped",
        dhl_status: `Pickup Scheduled: ${pickupRes.dispatchConfirmationNumber}`,
      })
      .eq("id", orderId);

    if (error) throw error;

    return NextResponse.json(pickupRes);
  } catch (err) {
    console.error("DHL Schedule Pickup Error:", err);
    return NextResponse.json({ 
      error: "Failed to schedule pickup", 
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}
