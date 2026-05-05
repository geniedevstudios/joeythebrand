import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

import { SERVICES } from "@/lib/servicesData";

const services = new Set(SERVICES.map(s => s.title));

function isValidDateYmd(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T12:00:00Z");
  return !Number.isNaN(d.getTime());
}

function isValidTimeHm(s: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(s)) return false;
  const [hh, mm] = s.split(":").map((n) => Number(n));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return false;
  if (hh < 0 || hh > 23) return false;
  if (mm !== 0 && mm !== 30) return false;
  return true;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const customerName = typeof o.customerName === "string" ? o.customerName.trim() : "";
  const customerEmail = typeof o.customerEmail === "string" ? o.customerEmail.trim() : "";
  const customerPhone = typeof o.customerPhone === "string" ? o.customerPhone.trim() : "";
  const service = typeof o.service === "string" ? o.service.trim() : "";
  const preferredDate = typeof o.preferredDate === "string" ? o.preferredDate.trim().slice(0, 10) : "";
  const preferredTime = typeof o.preferredTime === "string" ? o.preferredTime.trim() : "";
  const notes = typeof o.notes === "string" ? o.notes.trim() : "";
  const durationHours = typeof o.durationHours === "number" ? o.durationHours : null;
  const priceGhs = typeof o.priceGhs === "number" ? o.priceGhs : null;
  const paymentRef = typeof o.paymentRef === "string" ? o.paymentRef.trim() : "";

  if (!customerName || customerName.length > 200) {
    return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
  }
  if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) || customerEmail.length > 320) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }
  if (!customerPhone || customerPhone.length > 80) {
    return NextResponse.json({ error: "Please enter a phone or WhatsApp number." }, { status: 400 });
  }
  if (!service || !services.has(service)) {
    return NextResponse.json({ error: "Please choose a valid service." }, { status: 400 });
  }
  if (!preferredDate || !isValidDateYmd(preferredDate)) {
    return NextResponse.json({ error: "Please choose a preferred date." }, { status: 400 });
  }
  if (!preferredTime || !isValidTimeHm(preferredTime)) {
    return NextResponse.json({ error: "Please choose a preferred time." }, { status: 400 });
  }

  // Window: 08:00 through 15:00 inclusive.
  if (preferredTime < "08:00" || preferredTime > "15:00") {
    return NextResponse.json({ error: "Preferred time must be between 8:00am and 3:00pm." }, { status: 400 });
  }

  const today = new Date();
  const todayUtc = today.toISOString().slice(0, 10);
  if (preferredDate < todayUtc) {
    return NextResponse.json({ error: "Preferred date cannot be in the past." }, { status: 400 });
  }

  if (notes.length > 5000) {
    return NextResponse.json({ error: "Notes are too long." }, { status: 400 });
  }

  const portfolioAccessToken = crypto.randomUUID();

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("consultation_bookings").insert({
      user_id: null,
      source: "portfolio",
      portfolio_access_token: portfolioAccessToken,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      service,
      preferred_date: preferredDate,
      preferred_time: preferredTime,
      notes: notes || null,
      status: "pending",
      duration_hours: durationHours,
      price_ghs: priceGhs,
      payment_status: paymentRef ? "pending" : "unpaid",
      payment_ref: paymentRef || null,
    }).select("id").single();

    if (error) {
      const msg = error.message || "";
      if (/fully booked|day is fully booked/i.test(msg)) {
        return NextResponse.json(
          { error: "That day is fully booked. Please choose another date." },
          { status: 409 },
        );
      }
      if (/already have a request|duplicate/i.test(msg)) {
        return NextResponse.json(
          { error: "You already have a request for that day. Choose another date or contact us." },
          { status: 409 },
        );
      }
      console.error("Portfolio booking insert:", error);
      return NextResponse.json({ error: "Could not save your request. Try again later." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      id: data.id,
      slipToken: portfolioAccessToken,
      slipPath: `/booking/slip?token=${portfolioAccessToken}`,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
}
