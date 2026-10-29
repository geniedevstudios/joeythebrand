import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  createServerAuthoritativeOrder,
  type CreateOrderLineRequest,
} from "@/lib/orderWorkflow";
import { mapOrder } from "@/lib/dataStore";
import { scheduleUnpaidOrderReminder } from "@/lib/unpaidCheckout";

export const runtime = "nodejs";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function getSupabaseAnon() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";

    if (!token) {
      return NextResponse.json(
        { error: "Please sign in to place an order.", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const supabaseAnon = getSupabaseAnon();
    const { data: who, error: whoErr } = await supabaseAnon.auth.getUser(token);
    if (whoErr || !who?.user?.id) {
      return NextResponse.json(
        { error: "Your session has expired. Please sign in again.", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const body = (await req.json()) as {
      idempotencyKey?: string;
      customerName?: string;
      customerEmail?: string;
      customerPhone?: string;
      shippingDestination?: "ghana" | "international";
      shippingOption?: "dhl" | "sales" | null;
      shippingAddress?: string;
      destinationDetails?: {
        city: string;
        postalCode?: string;
        countryCode: string;
      };
      promotionCode?: string;
      notes?: string;
      items?: CreateOrderLineRequest[];
    };

    const result = await createServerAuthoritativeOrder({
      supabaseAdmin: getSupabaseAdmin(),
      input: {
        idempotencyKey: body.idempotencyKey,
        userId: who.user.id,
        customerName: String(body.customerName || "").trim(),
        customerEmail: String(body.customerEmail || who.user.email || "").trim(),
        customerPhone: String(body.customerPhone || "").trim(),
        shippingDestination:
          body.shippingDestination === "international" ? "international" : "ghana",
        shippingOption: body.shippingOption ?? null,
        shippingAddress: String(body.shippingAddress || "").trim(),
        destinationDetails: body.destinationDetails,
        promotionCode: body.promotionCode,
        notes: body.notes,
        items: Array.isArray(body.items) ? body.items : [],
      },
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          code: result.code,
          partialStockConflicts: result.partialStockConflicts,
          details: result.details,
        },
        { status: result.status },
      );
    }

    if (!result.idempotent) {
      void scheduleUnpaidOrderReminder({
        supabaseAdmin: getSupabaseAdmin(),
        order: result.order,
      }).catch((err) => {
        console.error("Unpaid checkout reminder schedule failed:", err);
      });
    }

    return NextResponse.json({
      ok: true,
      idempotent: result.idempotent,
      order: mapOrder(result.order),
      paystackReference: result.paystackReference,
      amountPesewas: result.amountPesewas,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Internal server error while creating order.",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
