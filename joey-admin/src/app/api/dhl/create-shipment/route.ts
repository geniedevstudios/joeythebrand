import { NextResponse } from "next/server";
import { createShipment } from "@/lib/dhl";
import { dataStore } from "@/lib/dataStore";
import { createClient } from "@supabase/supabase-js";

// Needs server role to bypass RLS when updating orders
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function parseAddress(shippingAddress: string) {
  // Check for the embedded DHL metadata: | DHL[City|PostalCode|CountryCode]
  const dhlMatch = shippingAddress.match(/DHL\[([^|]+)\|([^|]*)\|([^\]]+)\]/);
  if (dhlMatch) {
    return {
      addressLine1: shippingAddress.split("| DHL")[0].trim().substring(0, 45),
      city: dhlMatch[1].trim().substring(0, 45),
      postalCode: dhlMatch[2].trim(),
      countryCode: dhlMatch[3].trim()
    };
  }

  // Try to parse JSON from shippingAddress (fallback)
  try {
    if (shippingAddress.startsWith("{")) {
      const parsed = JSON.parse(shippingAddress);
      return {
        addressLine1: parsed.address || "Unknown",
        city: parsed.city || "Unknown",
        countryCode: parsed.country || "GH",
        postalCode: parsed.postalCode || ""
      };
    }
  } catch (e) {}

  // Ultimate Fallback
  return {
    addressLine1: shippingAddress.substring(0, 45) || "Unknown",
    city: "Unknown",
    countryCode: "GH",
    postalCode: ""
  };
}

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      throw new Error(error?.message || "Order not found");
    }

    if (order.dhl_tracking_number) {
      return NextResponse.json({ error: "Shipment already created", trackingNumber: order.dhl_tracking_number }, { status: 400 });
    }

    const destination = parseAddress(order.shipping_address);
    const items = (order.items || []).map((item: any) => ({
      name: item.name || "Clothing",
      quantity: item.quantity || 1,
      price: item.price || 0,
      weightKg: item.weightKg || 0.5,
      hsCode: "610910"
    }));

    const result = await createShipment({
      orderId,
      customerName: order.customer_name || "Customer",
      customerEmail: order.customer_email || "customer@example.com",
      customerPhone: order.customer_phone || "0000000000",
      destination,
      items
    });

    const labelUrl = `data:application/pdf;base64,${result.labelData}`;

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        dhl_tracking_number: result.trackingNumber,
        dhl_label_url: labelUrl,
        dhl_status: "Manifested",
        status: "shipped"
      })
      .eq("id", orderId);

    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ trackingNumber: result.trackingNumber, labelUrl });
  } catch (err: any) {
    console.error("Create shipment error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
