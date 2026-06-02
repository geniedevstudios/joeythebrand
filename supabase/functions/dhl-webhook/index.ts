import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, dhl-signature",
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Optional: Verify DHL Webhook Signature
  // const signature = req.headers.get("dhl-signature");
  // const secret = Deno.env.get("DHL_WEBHOOK_SECRET");
  // Implement HMAC verification here if required by DHL.

  let payload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  // Example DHL Express tracking payload mapping:
  // Note: Adjust the exact paths depending on the exact DHL webhook specification.
  const trackingNumber = payload?.shipmentTrackingNumber;
  const dhlEvent = payload?.events?.[0]; // Usually the latest event
  const dhlStatusCode = dhlEvent?.typeCode; 
  const dhlStatusDescription = dhlEvent?.description;

  if (!trackingNumber) {
    return jsonResponse({ error: "Missing tracking number in payload" }, 400);
  }

  // Map DHL status code to our internal OrderStatus
  let internalStatus = undefined;
  if (dhlStatusCode) {
    // These are example codes, replace with actual DHL Express status codes
    const deliveredCodes = ["OK", "DL"]; // Example: OK or DL for Delivered
    const shippedCodes = ["PU", "PL", "TD", "WC"]; // Picked up, etc.
    const cancelledCodes = ["CA"];

    if (deliveredCodes.includes(dhlStatusCode)) {
      internalStatus = "delivered";
    } else if (shippedCodes.includes(dhlStatusCode)) {
      internalStatus = "shipped";
    } else if (cancelledCodes.includes(dhlStatusCode)) {
      internalStatus = "cancelled";
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return jsonResponse({ error: "Server misconfiguration" }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const updateData: Record<string, any> = {
    dhl_status: dhlStatusDescription || "Unknown",
    updated_at: new Date().toISOString(),
  };

  if (internalStatus) {
    updateData.status = internalStatus;
  }

  const { error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("dhl_tracking_number", trackingNumber);

  if (error) {
    console.error("Failed to update order in database:", error);
    return jsonResponse({ error: "Database update failed" }, 500);
  }

  return jsonResponse({ ok: true });
});
