import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { validCustomsComponents, type CustomsProfile } from "@/lib/customsProfile";
import { createShipment, dhlWireCustomsLines, getDhlEnvironment, dhlOrderReference, DhlBookingRejected, DhlDocumentsIncomplete, parseDhlAddress, SHIPPER_DETAILS, type DhlCustomsLine } from "@/lib/dhl";
import { prefillCustomsDescription, validateCustomsDescription, validateShipmentDescription } from "@/lib/dhlDescriptions";
import { DHL_INVOICE_FREIGHT_SOURCE, DHL_REQUIRE_INBOUND_HS, shouldReviewDhlFreight } from "@/lib/dhlRules";
import { validateDhlStreet } from "@/lib/dhlStreet";
import { validatePackedWeights } from "@/lib/dhlWeights";
import { readDhlParcel } from "@/lib/dhlParcel";
import { measuredParcelFreight, shippingCostForDhl } from "@/lib/dhlFreight";
import { normalizePhone } from "@/lib/normalizePhone";
import { isDhlShippingAddress } from "@/lib/formatShippingAddress";
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

async function prepareShipment(orderId: string, review = false) {
  const { data: order, error } = await supabaseAdmin.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (error) throw error;
  if (!order) return problem("Order not found.", 404);
  if (review && Array.isArray(order.dhl_customs_lines)) {
    return { customsLines: order.dhl_customs_lines as ReturnType<typeof dhlWireCustomsLines>, itemDescription: String(order.dhl_shipment_description ?? ""), frozen: true as const };
  }
  if (order.dhl_tracking_number) return problem("Shipment already created. Download the existing label.", 409);
  if (order.dhl_shipment_claimed_at) return problem("A shipment request is in progress or needs reconciliation with DHL.", 409);
  if (order.stock_conflict_flagged || order.payment_status !== "paid" || order.status !== "order packaged") {
    return problem("The order must be paid, packaged, and free of stock conflicts.", 409);
  }

  let orderNumber: string;
  try {
    orderNumber = dhlOrderReference(order.order_number);
  } catch (error) {
    if (error instanceof DhlBookingRejected) return problem(error.message, 409);
    throw error;
  }
  const destination = parseDhlAddress(order.shipping_address);
  if (!destination) return problem("This order does not have a valid DHL delivery address.", 409);
  const addressError = validateDhlStreet(destination);
  if (addressError) return problem(addressError, 409);
  const customerName = String(order.customer_name ?? "").trim();
  const customerEmail = String(order.customer_email ?? "").trim();
  const originalPhone = String(order.customer_phone ?? "");
  const customerPhone = normalizePhone(originalPhone);
  if (!customerName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return problem("The order needs a valid recipient name and email before generating a label.", 409);
  }
  if (!customerPhone) return problem("Correct the recipient phone to a valid international number before booking.", 409);

  const items = order.items as StoredItem[];
  if (!Array.isArray(items) || !items.length) return problem("The order has no items to declare.", 409);
  const isExport = destination.countryCode !== SHIPPER_DETAILS.postalAddress.countryCode;
  const itemProductIds = items.map((item) => item?.productId || item?.product_id);
  if (isExport && itemProductIds.some((id) => !id)) {
    return problem("An order item is missing its catalogue product.", 409);
  }

  const ids = [...new Set(itemProductIds.filter((id): id is string => !!id))];
  const { data: products, error: productError } = ids.length
    ? await supabaseAdmin.from("products").select("id, name, description, customs_profile").in("id", ids)
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
      const product = productsById.get(item.productId || item.product_id);
      const profile = product?.customs_profile as CustomsProfile | null | undefined;
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
          description: prefillCustomsDescription(component),
          productName: typeof product?.name === "string" ? product.name : item.name,
          intendedWearer: component.intendedWearer,
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
  const freight = shippingCostForDhl(order.shipping_cost, isExport);
  if (freight === null) return problem(isExport
    ? "No freight amount on this order; re-quote before booking"
    : "The order has an invalid DHL freight amount.", 409);
  return { orderId, orderNumber, customerName, customerEmail, customerPhone, originalPhone, destination, customsLines, itemDescription, freight, frozen: false as const };
}

export async function GET(request: Request) {
  try {
    if (!(await isDhlOperator(request))) return problem("Forbidden", 403);
    const orderId = new URL(request.url).searchParams.get("orderId");
    if (!orderId) return problem("Missing order ID.", 400);
    const shipment = await prepareShipment(orderId, true);
    if (shipment instanceof Response) return shipment;
    const freightReviewEnabled = shipment.customsLines.length > 0 && !shipment.frozen
      && shouldReviewDhlFreight(getDhlEnvironment().environment);
    return NextResponse.json({
      customsLines: shipment.customsLines,
      itemDescription: shipment.itemDescription,
      frozen: shipment.frozen,
      freightReviewEnabled,
      paidFreight: freightReviewEnabled && "freight" in shipment ? shipment.freight : undefined,
      countryCode: "destination" in shipment ? shipment.destination?.countryCode : undefined,
    });
  } catch (error) {
    console.error("DHL shipment preparation failed:", error);
    return problem("Could not load shipment details.", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    if (!(await isDhlOperator(request))) return problem("Forbidden", 403);
    const { orderId, phone } = await request.json();
    const normalized = normalizePhone(phone);
    if (typeof orderId !== "string" || !orderId || !normalized) return problem("Enter a valid full international phone number.", 400);
    const { data: order, error } = await supabaseAdmin.from("orders")
      .select("customer_phone,shipping_address,dhl_tracking_number,dhl_shipment_claimed_at,dhl_pickup_claimed_at")
      .eq("id", orderId).maybeSingle();
    if (error) throw error;
    if (!order || !(isDhlShippingAddress(order.shipping_address) || parseDhlAddress(order.shipping_address) || order.dhl_tracking_number)) return problem("No DHL order found.", 404);
    if (order.dhl_shipment_claimed_at || order.dhl_pickup_claimed_at) return problem("Resolve the in-progress DHL operation before changing the phone.", 409);
    if (order.customer_phone === normalized) return NextResponse.json({ customerPhone: normalized });
    const { data: updated, error: updateError } = await supabaseAdmin.from("orders")
      .update({ customer_phone: normalized, customer_phone_previous: order.customer_phone })
      .eq("id", orderId).eq("customer_phone", order.customer_phone)
      .is("dhl_shipment_claimed_at", null).is("dhl_pickup_claimed_at", null)
      .select("id").maybeSingle();
    if (updateError) throw updateError;
    if (!updated) return problem("The order changed. Refresh before saving the phone.", 409);
    return NextResponse.json({ customerPhone: normalized });
  } catch (error) {
    console.error("DHL phone correction failed:", error);
    return problem("Could not save the recipient phone.", 500);
  }
}

export async function POST(request: Request) {
  let claim: { orderId: string; timestamp: string } | undefined;
  try {
    if (!(await isDhlOperator(request))) return problem("Forbidden", 403);
    const { orderId, parcel: measurements, customsLines, itemDescription, action, confirmedFreight } = await request.json();
    const parcel = readDhlParcel(measurements);
    if (typeof orderId !== "string" || !orderId || !parcel) {
      return problem("Enter a positive packed weight in kg and all three measured dimensions in cm.", 400);
    }
    const shipment = await prepareShipment(orderId);
    if (shipment instanceof Response) return shipment;
    if (shipment.frozen !== false || !("destination" in shipment)) return problem("This shipment is already frozen.", 409);
    let environment;
    try {
      ({ environment } = getDhlEnvironment());
    } catch (error) {
      return problem(error instanceof Error ? error.message : "DHL environment is not configured.", 503);
    }
    const isExport = shipment.destination.countryCode !== "GH";
    const freightReviewEnabled = isExport && shouldReviewDhlFreight(environment);
    if (action === "quote") {
      if (!isExport) return problem("Freight review is only required for exports.", 400);
      if (!freightReviewEnabled) return problem("Freight review is disabled for this sandbox demo.", 409);
      return NextResponse.json({
        paid: shipment.freight,
        current: await measuredParcelFreight(shipment.destination, parcel),
      });
    }
    const descriptionError = validateShipmentDescription(itemDescription, shipment.destination.countryCode === "GH");
    if (descriptionError) return problem(descriptionError, 400);
    shipment.itemDescription = itemDescription.trim();
    if (shipment.customsLines.length) {
      // Recheck the reviewed customs data against the catalogue before accepting measured weights.
      if (!Array.isArray(customsLines) || customsLines.length !== shipment.customsLines.length) {
        return problem("Reopen the shipment and review the customs lines.", 409);
      }
      for (const [index, line] of shipment.customsLines.entries()) {
        if (DHL_REQUIRE_INBOUND_HS && !line.inboundHsCode) {
          return problem(`Add the ${shipment.destination.countryCode} import HS code for this product.`, 409);
        }
        const measured = customsLines[index];
        if (!measured || line.hsCode !== measured.hsCode || line.inboundHsCode !== measured.inboundHsCode ||
          line.quantity !== measured.quantity || line.price !== measured.price ||
          typeof measured.weightKg !== "number" || !Number.isFinite(measured.weightKg) || measured.weightKg <= 0) {
          return problem("The customs lines changed or contain an invalid net weight. Reopen the shipment and review them.", 409);
        }
        const descriptionError = validateCustomsDescription(measured.description, line.productName, line.intendedWearer);
        if (descriptionError) return problem(`Customs line ${index + 1}: ${descriptionError}`, 400);
        if (measured.confirmed !== true) return problem(`Confirm the actual goods for customs line ${index + 1}.`, 400);
        line.description = measured.description.trim();
        const grossWeight = measured.grossWeightKg ?? measured.weightKg;
        if (typeof grossWeight !== "number" || !Number.isFinite(grossWeight) || grossWeight < measured.weightKg) {
          return problem("Gross weight per unit must be at least the garment net weight.", 400);
        }
        line.weightKg = measured.weightKg;
        line.grossWeightKg = grossWeight;
      }
      const weightError = validatePackedWeights(parcel.weight, shipment.customsLines);
      if (weightError) return problem(weightError, 400);
    }

    const currentFreight = freightReviewEnabled ? await measuredParcelFreight(shipment.destination, parcel) : null;
    const freightWarning = freightReviewEnabled && currentFreight === null
      ? "Current DHL freight is unavailable. The label uses the stored checkout amount."
      : undefined;
    if (currentFreight !== null && currentFreight !== shipment.freight && confirmedFreight !== currentFreight) {
      return NextResponse.json({ error: "Review and confirm the current DHL freight before booking.",
        paid: shipment.freight, current: currentFreight }, { status: 409 });
    }
    const freightSent = isExport && DHL_INVOICE_FREIGHT_SOURCE === "fresh" && currentFreight !== null
      ? currentFreight : shipment.freight;

    const timestamp = new Date().toISOString();
    const { data: claimed, error: claimError } = await supabaseAdmin.from("orders")
      .update({
        dhl_shipment_claimed_at: timestamp,
        dhl_environment: environment,
        dhl_parcel: parcel,
        dhl_customs_lines: dhlWireCustomsLines(shipment.customsLines),
        dhl_shipment_description: shipment.itemDescription,
        dhl_freight_amount: isExport ? freightSent : null,
      })
      .eq("id", orderId).eq("customer_phone", shipment.originalPhone).eq("payment_status", "paid").eq("status", "order packaged").eq("stock_conflict_flagged", false)
      .is("dhl_tracking_number", null).is("dhl_shipment_claimed_at", null).select("id").maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) return problem("This order changed or a shipment is already being processed.", 409);
    claim = { orderId, timestamp };

    const result = await createShipment({ ...shipment, parcel, freight: freightSent });
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

    return NextResponse.json({ trackingNumber: result.trackingNumber, labelUrl, freightWarning });
  } catch (error) {
    if (claim && error instanceof DhlBookingRejected) {
      const { error: releaseError } = await supabaseAdmin.from("orders").update({ dhl_shipment_claimed_at: null, dhl_customs_lines: null, dhl_shipment_description: null, dhl_freight_amount: null, dhl_environment: null })
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
