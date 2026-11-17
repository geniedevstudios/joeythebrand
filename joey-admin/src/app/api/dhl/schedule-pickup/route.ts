import { normalizePhone } from "@/lib/normalizePhone";
import { isDhlOperator } from "@/lib/dhlRequestAuth";
import { NextResponse } from "next/server";
import { DhlBookingRejected, getDhlEnvironment, parseDhlAddress, schedulePickup, SHIPPER_DETAILS } from "@/lib/dhl";
import { validateDhlStreet } from "@/lib/dhlStreet";
import { dhlEnvironmentMatches } from "@/lib/dhlRules";
import { readDhlParcel } from "@/lib/dhlParcel";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
export const runtime = "nodejs";

function problem(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: Request) {
  let claim: { orderId: string; timestamp: string } | undefined;
  try {
    if (!(await isDhlOperator(req))) return problem("Forbidden", 403);
    const { orderId, trackingNumber, parcel: measuredParcel, specialInstructions } = await req.json();
    if (typeof orderId !== "string" || !orderId || typeof trackingNumber !== "string" || !trackingNumber) {
      return problem("Missing order ID or tracking number.", 400);
    }

    if (specialInstructions != null && typeof specialInstructions !== "string") {
      return problem("Pickup instructions must be text.", 400);
    }

    const { data: order, error: lookupError } = await supabaseAdmin.from("orders")
      .select("customer_name,customer_email,customer_phone,payment_status,status,stock_conflict_flagged,dhl_tracking_number,shipping_address,dhl_status,dhl_parcel,dhl_declared_value,dhl_pickup_claimed_at,dhl_pickup_confirmation,dhl_environment,items")
      .eq("id", orderId).maybeSingle();
    if (lookupError) throw lookupError;
    if (!order || order.payment_status !== "paid" || order.stock_conflict_flagged ||
      order.status === "paid_requires_resolution" || order.status === "cancelled" ||
      order.dhl_tracking_number !== trackingNumber) {
      return problem("Order is not eligible for pickup.", 409);
    }
    let active;
    try {
      active = getDhlEnvironment();
    } catch (error) {
      return problem(error instanceof Error ? error.message : "DHL environment is not configured.", 503);
    }
    if (!dhlEnvironmentMatches(order.dhl_environment, active)) {
      return problem("This waybill has a different or unknown DHL environment. Classify it before booking pickup.", 409);
    }
    const legacyConfirmation = order.dhl_status?.match(/^Pickup Scheduled: (.+)$/)?.[1];
    const existingConfirmation = order.dhl_pickup_confirmation || legacyConfirmation;
    if (existingConfirmation) return NextResponse.json({ dispatchConfirmationNumber: existingConfirmation });
    if (order.dhl_pickup_claimed_at) return problem("A pickup request is in progress or needs reconciliation with DHL.", 409);

    const parcel = readDhlParcel(order.dhl_parcel) ?? readDhlParcel(measuredParcel);
    if (!parcel) return problem("Enter the packed weight and dimensions for this existing shipment.", 400);
    const destination = parseDhlAddress(order.shipping_address);
    if (!destination) return problem("The order is missing its DHL address.", 409);
    const addressError = validateDhlStreet(destination);
    if (addressError) return problem(addressError, 409);
    const isDomestic = destination.countryCode === SHIPPER_DETAILS.postalAddress.countryCode;
    const declaredValue = isDomestic ? undefined : Number(order.dhl_declared_value ??
      // Older labels used the full merchandise amount before discount.
      order.items?.reduce((sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity, 0));
    if (declaredValue !== undefined && (!Number.isFinite(declaredValue) || declaredValue <= 0)) {
      return problem("Confirm the declared value on the original DHL shipment before scheduling pickup.", 409);
    }

    const customerName = String(order.customer_name ?? "").trim();
    const customerEmail = String(order.customer_email ?? "").trim();
    const customerPhone = normalizePhone(order.customer_phone);
    if (!customerName || !customerEmail || !customerPhone) return problem("The order needs valid DHL contacts. Correct the recipient phone to a valid international number if needed.", 409);

    const timestamp = new Date().toISOString();
    const { data: claimed, error: claimError } = await supabaseAdmin.from("orders")
      .update({ dhl_pickup_claimed_at: timestamp, dhl_parcel: parcel })
      .eq("id", orderId).eq("customer_phone", order.customer_phone).eq("dhl_tracking_number", trackingNumber).eq("payment_status", "paid")
      .eq("status", order.status).eq("stock_conflict_flagged", false)
      .is("dhl_pickup_confirmation", null).is("dhl_pickup_claimed_at", null).select("id").maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) return problem("This order changed or a pickup is already being processed.", 409);
    claim = { orderId, timestamp };

    const pickup = await schedulePickup(trackingNumber, parcel, { destination, customerName, customerEmail, customerPhone }, declaredValue, specialInstructions);
    const { data: saved, error: saveError } = await supabaseAdmin.from("orders")
      .update({
        dhl_pickup_confirmation: pickup.dispatchConfirmationNumber,
        dhl_status: `Pickup Scheduled: ${pickup.dispatchConfirmationNumber}`,
        dhl_pickup_claimed_at: null,
      })
      .eq("id", orderId).eq("dhl_pickup_claimed_at", timestamp).select("id").maybeSingle();
    if (saveError || !saved) {
      console.error("DHL booked a pickup that Joey could not save:", orderId, pickup.dispatchConfirmationNumber, saveError);
      return problem(`DHL issued pickup confirmation ${pickup.dispatchConfirmationNumber}. Reconcile it with DHL before trying again.`, 502);
    }
    return NextResponse.json(pickup);
  } catch (error) {
    if (claim && error instanceof DhlBookingRejected) {
      const { error: releaseError } = await supabaseAdmin.from("orders").update({ dhl_pickup_claimed_at: null })
        .eq("id", claim.orderId).eq("dhl_pickup_claimed_at", claim.timestamp);
      if (!releaseError) return problem(error.message, 422);
      console.error("Could not release DHL pickup claim:", releaseError);
    }
    console.error("DHL pickup failed:", error);
    return problem(claim
      ? "The pickup result is uncertain. Check DHL for an existing pickup before retrying."
      : "Could not prepare the DHL pickup.", 502);
  }
}
