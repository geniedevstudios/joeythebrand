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

  const signature = req.headers.get("dhl-signature");
  const secret = Deno.env.get("DHL_WEBHOOK_SECRET");

  if (!secret) return jsonResponse({ error: "DHL push tracking is not configured" }, 503);
  if (!signature || !/^[0-9a-f]{64}$/i.test(signature)) {
    return jsonResponse({ error: "Invalid webhook signature" }, 401);
  }

  const bodyText = await req.text();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"],
  );
  const signatureBytes = Uint8Array.from(signature.match(/../g)!, (pair) => parseInt(pair, 16));
  if (!await crypto.subtle.verify("HMAC", key, signatureBytes, encoder.encode(bodyText))) {
    return jsonResponse({ error: "Invalid webhook signature" }, 401);
  }

  let payload;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  // Example DHL Express tracking payload mapping:
  // Note: Adjust the exact paths depending on the exact DHL webhook specification.
  const trackingNumber = payload?.shipmentTrackingNumber;
  const dhlEvent = payload?.events?.[0]; // Usually the latest event
  const dhlStatusDescription = dhlEvent?.description;

  if (typeof trackingNumber !== "string" || !/^\d{10}$/.test(trackingNumber) ||
    typeof dhlStatusDescription !== "string" || !dhlStatusDescription.trim()) {
    return jsonResponse({ error: "Unsupported DHL tracking payload" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return jsonResponse({ error: "Server misconfiguration" }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Carrier events update tracking without advancing Joey's preparation status.
  const { error } = await supabase
    .from("orders")
    .update({
      dhl_status: dhlStatusDescription,
      updated_at: new Date().toISOString(),
    })
    .eq("dhl_tracking_number", trackingNumber);

  if (error) {
    console.error("Failed to update order in database:", error);
    return jsonResponse({ error: "Database update failed" }, 500);
  }

  return jsonResponse({ ok: true });
});
