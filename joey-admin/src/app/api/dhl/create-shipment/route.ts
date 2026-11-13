import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { validCustomsComponents, type CustomsProfile } from "@/lib/customsProfile";
import { createShipment, DhlBookingRejected, DhlDocumentsIncomplete, parseDhlAddress, SHIPPER_DETAILS, type DhlCustomsLine } from "@/lib/dhl";
import { readDhlParcel } from "@/lib/dhlParcel";
import { isDhlOperator } from "@/lib/dhlRequestAuth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function problem(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

type StoredItem = {
  name?: string;
  productId?: string;
  product_id?: string;
  quantity: number;
  price: number;
};

async function prepareShipment(orderId: string) {
  const { data: order, error } = await supabaseAdmin.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (error) throw error;
  if (!order) return problem("Order not found.", 404);
  if (order.dhl_tracking_number) return problem("Shipment already created. Download the existing label.", 409);
  if (order.dhl_shipment_claimed_at) return problem("A shipment request is in progress or needs reconciliation with DHL.", 409);
  if (order.stock_conflict_flagged || order.payment_status !== "paid" || order.status !== "order packaged") {
    return problem("The order must be paid, packaged, and free of stock conflicts.", 409);
  }

  const destination = parseDhlAddress(order.shipping_address);
  if (!destination) return problem("This order does not have a valid DHL delivery address.", 409);
  const customerName = String(order.customer_name ?? "").trim();
  const customerEmail = String(order.customer_email ?? "").trim();
  const customerPhone = String(order.customer_phone ?? "").trim();
  if (!customerName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) ||
    !/^\+?[\d ().-]+$/.test(customerPhone) || !/^\d{7,15}$/.test(customerPhone.replace(/\D/g, ""))) {
    return problem("The order needs a valid recipient name, email, and phone number before generating a label.", 409);
  }

  const items = order.items as StoredItem[];
  if (!Array.isArray(items) || !items.length) return problem("The order has no items to declare.", 409);
  const isExport = destination.countryCode !== SHIPPER_DETAILS.postalAddress.countryCode;
  const itemProductIds = items.map((item) => item?.productId || item?.product_id);
  if (isExport && itemProductIds.some((id) => !id)) {
    return problem("An order item is missing its catalogue product.", 409);
  }

  const ids = [...new Set(itemProductIds.filter((id): id is string => !!id))];
  const { data: products, error: productError } = ids.length
    ? await supabaseAdmin.from("products").select("id, description, customs_profile").in("id", ids)
    : { data: [], error: null };
  if (productError) throw productError;
  const productsById = new Map((products ?? []).map((product) => [product.id, product]));

  const customsLines: DhlCustomsLine[] = [];
  if (isExport) {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discount = Number(order.discount ?? 0);
    if (!Number.isFinite(subtotal) || !Number.isFinite(discount) || discount < 0 || subtotal <= discount) {
      return problem("The order needs a positive merchandise value. Confirm the customs valuation before shipping.", 409);
    }
    for (const item of items) {
      const profile = productsById.get(item.productId || item.product_id)?.customs_profile as CustomsProfile | null | undefined;
      if (profile?.verified !== true || !validCustomsComponents(profile.components)) {
        return problem(`Verify export customs details for ${item.name || "the order item"} in Products, then reopen this shipment.`, 409);
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || !Number.isFinite(item.price) || item.price <= 0) {
        return problem(`Invalid quantity or sale value for ${item.name || "an order item"}.`, 409);
      }
      const unitValue = Math.round(item.price * (1 - discount / subtotal) * 100);
      let cumulativeShare = 0;
      let previousCents = 0;
      for (const component of profile.components) {
        cumulativeShare += component.valueShare;
        const cents = Math.round(unitValue * cumulativeShare / 100);
        const price = (cents - previousCents) / 100;
        if (price <= 0) return problem(`A customs line for ${item.name || "an order item"} has no positive unit value.`, 409);
        previousCents = cents;
        customsLines.push({
          description: component.description.trim(),
          quantity: item.quantity,
          price,
          weightKg: component.weightKg,
          hsCode: component.hsCode,
          inboundHsCode: component.inboundCountry === destination.countryCode ? component.inboundHsCode : undefined,
        });
      }
    }
  }

  const descriptions = items.map((item, index) => {
    const product = productsById.get(itemProductIds[index]);
    const profile = product?.customs_profile as CustomsProfile | null | undefined;
    const customsDescription = isExport ? profile?.components.map((line) => line.description).join(", ") : undefined;
    return product?.description?.trim() || customsDescription || item?.name?.trim();
  }).filter(Boolean);
  const itemDescription = [...new Set(descriptions)].join(", ").replace(/\s+/g, " ").trim();
  if (!itemDescription) return problem("The order needs an item description.", 409);
  const freight = Number(order.shipping_cost ?? 0);
  if (!Number.isFinite(freight) || freight < 0) return problem("The order has an invalid DHL freight amount.", 409);
  return { orderId, customerName, customerEmail, customerPhone, destination, customsLines, itemDescription, freight };
}

export async function GET(request: Request) {
  try {
    if (!(await isDhlOperator(request))) return problem("Forbidden", 403);
    const orderId = new URL(request.url).searchParams.get("orderId");
    if (!orderId) return problem("Missing order ID.", 400);
    const shipment = await prepareShipment(orderId);
    if (shipment instanceof Response) return shipment;
    return NextResponse.json({ customsLines: shipment.customsLines });
  } catch (error) {
    console.error("DHL shipment preparation failed:", error);
    return problem("Could not load shipment details.", 500);
  }
}

export async function POST(request: Request) {
  let claim: { orderId: string; timestamp: string } | undefined;
  try {
    if (!(await isDhlOperator(request))) return problem("Forbidden", 403);
    const { orderId, parcel: measurements, customsLines } = await request.json();
    const parcel = readDhlParcel(measurements);
    if (typeof orderId !== "string" || !orderId || !parcel) {
      return problem("Enter a positive packed weight in kg and all three measured dimensions in cm.", 400);
    }
    const shipment = await prepareShipment(orderId);
    if (shipment instanceof Response) return shipment;
    if (shipment.customsLines.length) {
      // Recheck the reviewed customs data against the catalogue before accepting measured weights.
      if (!Array.isArray(customsLines) || customsLines.length !== shipment.customsLines.length) {
        return problem("Reopen the shipment and review the customs lines.", 409);
      }
      for (const [index, line] of shipment.customsLines.entries()) {
        const measured = customsLines[index];
        if (!measured || line.hsCode !== measured.hsCode || line.description !== measured.description ||
          line.quantity !== measured.quantity || line.price !== measured.price ||
          typeof measured.weightKg !== "number" || !Number.isFinite(measured.weightKg) || measured.weightKg <= 0) {
          return problem("The customs lines changed or contain an invalid net weight. Reopen the shipment and review them.", 409);
        }
        const grossWeight = measured.grossWeightKg ?? measured.weightKg;
        if (typeof grossWeight !== "number" || !Number.isFinite(grossWeight) || grossWeight < measured.weightKg) {
          return problem("Gross weight per unit must be at least the garment net weight.", 400);
        }
        line.weightKg = measured.weightKg;
        line.grossWeightKg = grossWeight;
      }
      const grossWeight = shipment.customsLines.reduce((sum, line) => sum + (line.grossWeightKg ?? line.weightKg) * line.quantity, 0);
      if (parcel.weight + 0.000001 < grossWeight) return problem("Packed weight is below the total gross weight of the customs lines.", 400);
    }

    const timestamp = new Date().toISOString();
    const { data: claimed, error: claimError } = await supabaseAdmin.from("orders")
      .update({ dhl_shipment_claimed_at: timestamp, dhl_parcel: parcel })
      .eq("id", orderId).eq("payment_status", "paid").eq("status", "order packaged").eq("stock_conflict_flagged", false)
      .is("dhl_tracking_number", null).is("dhl_shipment_claimed_at", null).select("id").maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) return problem("This order changed or a shipment is already being processed.", 409);
    claim = { orderId, timestamp };

    const result = await createShipment({ ...shipment, parcel });
    const labelUrl = `data:application/pdf;base64,${result.labelData}`;
    const { data: saved, error: saveError } = await supabaseAdmin.from("orders")
      .update({
        dhl_tracking_number: result.trackingNumber,
        dhl_label_url: labelUrl,
        dhl_status: "Manifested",
        dhl_declared_value: shipment.customsLines.length ? result.declaredValue : null,
        dhl_shipment_claimed_at: null,
      })
      .eq("id", orderId).eq("dhl_shipment_claimed_at", timestamp).select("id").maybeSingle();

    if (saveError || !saved) {
      console.error("DHL booked a shipment that Joey could not save:", orderId, result.trackingNumber, saveError);
      return problem(`DHL issued tracking ${result.trackingNumber}. Reconcile it with DHL before trying again.`, 502);
    }

    return NextResponse.json({ trackingNumber: result.trackingNumber, labelUrl });
  } catch (error) {
    if (claim && error instanceof DhlBookingRejected) {
      const { error: releaseError } = await supabaseAdmin.from("orders").update({ dhl_shipment_claimed_at: null })
        .eq("id", claim.orderId).eq("dhl_shipment_claimed_at", claim.timestamp);
      if (!releaseError) return problem(error.message, 422);
      console.error("Could not release DHL shipment claim:", releaseError);
    }
    if (error instanceof DhlDocumentsIncomplete) return problem(error.message, 502);
    console.error("DHL shipment creation failed:", error);
    return problem(claim
      ? "The shipment result is uncertain. Check DHL for the order reference before retrying."
      : "Could not prepare the DHL shipment.", 502);
  }
}
