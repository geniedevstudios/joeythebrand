import { isDhlOperator } from "@/lib/dhlRequestAuth";
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
    if (!(await isDhlOperator(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = await req.json();
    const { orderId, trackingNumber } = body;

    if (!orderId || !trackingNumber) {
      return NextResponse.json({ error: "Missing orderId or trackingNumber" }, { status: 400 });
    }

    const { data: order, error: lookupError } = await supabaseAdmin.from("orders").select("payment_status,status,stock_conflict_flagged,dhl_tracking_number").eq("id", orderId).single();
    if (lookupError || !order || order.payment_status !== "paid" || order.stock_conflict_flagged || order.status === "paid_requires_resolution" || order.dhl_tracking_number !== trackingNumber) {
      return NextResponse.json({ error: "Order is not eligible for pickup." }, { status: 409 });
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
