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
      postalCode: (dhlMatch[2] || "").trim().toUpperCase(),
      countryCode: dhlMatch[3].trim()
    };
  }

  // Try to parse JSON from shippingAddress (fallback)
  try {
    if (shippingAddress.startsWith("{")) {
      const parsed = JSON.parse(shippingAddress);
      if (!parsed.city || !parsed.countryCode) {
        throw new Error("Invalid structured address: missing city or countryCode");
      }
      return {
        addressLine1: (parsed.addressLine1 || parsed.address || "").substring(0, 45),
        city: parsed.city.substring(0, 45),
        countryCode: parsed.countryCode,
        postalCode: (parsed.postalCode || "").trim().toUpperCase()
      };
    }
  } catch (e) {}

  throw new Error(`Invalid shipping address format: ${shippingAddress}`);
}

export async function POST(request: Request) {
  try {
    const { orderId, packageDimensions } = await request.json();
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
    const productIds = (order.items || []).map((item: any) => item.productId || item.product_id).filter(Boolean);
    let productsMap: Record<string, any> = {};
    
    if (productIds.length > 0) {
      const { data: products } = await supabaseAdmin
        .from("products")
        .select("id, hs_code, weight_kg")
        .in("id", productIds);
        
      productsMap = (products || []).reduce((acc: any, p: any) => {
        acc[p.id] = p;
        return acc;
      }, {});
    }

    const items = (order.items || []).map((item: any) => {
      const pId = item.productId || item.product_id;
      const product = productsMap[pId] || {};
      
      return {
        name: item.name || "Clothing",
        quantity: item.quantity || 1,
        price: item.price || 0,
        weightKg: item.weightKg || item.weight_kg || product.weight_kg || 0.5,
        hsCode: item.hsCode || item.hs_code || product.hs_code || "6114.20.00" // generic apparel fallback
      };
    });

    const result = await createShipment({
      orderId,
      customerName: order.customer_name || "Customer",
      customerEmail: order.customer_email || "customer@example.com",
      customerPhone: order.customer_phone || "0000000000",
      destination,
      items,
      packageDimensions
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
