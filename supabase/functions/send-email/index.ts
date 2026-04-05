import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import {
  orderConfirmationHtml,
  orderConfirmationPlainText,
  type OrderConfirmationPayload,
} from "./templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type RequestBody = {
  template: "order_confirmation";
  to?: string;
  order: OrderConfirmationPayload;
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getBearer(req: Request): string | null {
  const h = req.headers.get("Authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7).trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const secret = Deno.env.get("SEND_EMAIL_SECRET");
  if (!secret) {
    console.error("SEND_EMAIL_SECRET is not set");
    return jsonResponse({ error: "Server misconfiguration" }, 500);
  }

  const token = getBearer(req);
  if (!token || token !== secret) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  if (body.template !== "order_confirmation" || !body.order?.id) {
    return jsonResponse({ error: "Invalid template or order" }, 400);
  }

  const to = (body.to ?? body.order.customerEmail).trim();
  if (!to) {
    return jsonResponse({ error: "Missing recipient" }, 400);
  }

  const smtpHost = Deno.env.get("SMTP_HOST");
  const smtpUser = Deno.env.get("SMTP_USER");
  const smtpPass = Deno.env.get("SMTP_PASS");
  const smtpFrom = Deno.env.get("SMTP_FROM_EMAIL");
  const smtpName = Deno.env.get("SMTP_FROM_NAME") ?? "JOEY THE BRAND";

  if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
    console.error("Missing SMTP_HOST, SMTP_USER, SMTP_PASS, or SMTP_FROM_EMAIL");
    return jsonResponse({ error: "Server misconfiguration" }, 500);
  }

  const portRaw = Deno.env.get("SMTP_PORT");
  const port = portRaw ? Number(portRaw) : 587;
  const tlsEnv = Deno.env.get("SMTP_TLS");
  const tls = tlsEnv === "true" || tlsEnv === "1";

  const html = orderConfirmationHtml(body.order);
  const text = orderConfirmationPlainText(body.order);
  const subject = `Order confirmed — JOEY THE BRAND (${body.order.id.slice(0, 8)}…)`;

  const client = new SMTPClient({
    connection: {
      hostname: smtpHost,
      port,
      tls,
      auth: { username: smtpUser, password: smtpPass },
    },
  });

  try {
    await client.send({
      from: `${smtpName} <${smtpFrom}>`,
      to,
      subject,
      html,
      content: text,
    });
  } catch (e) {
    console.error("SMTP send failed:", e);
    return jsonResponse({ error: "Failed to send email" }, 502);
  } finally {
    try {
      await client.close();
    } catch {
      /* ignore */
    }
  }

  return jsonResponse({ ok: true });
});
