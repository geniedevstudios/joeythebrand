import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { reference, orderId } = await req.json();

    if (!reference || !orderId) {
      return NextResponse.json({ error: "Missing reference or orderId" }, { status: 400 });
    }

    // 1. Verify with Paystack
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const paystackData = await paystackRes.json();

    if (!paystackRes.ok || !paystackData.status || paystackData.data.status !== "success") {
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
    }

    // 2. Update Supabase Order using Admin Client (Bypass RLS)
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from("orders")
      .update({
        payment_status: "paid",
        payment_ref: reference,
        status: "processing", // Move to processing automatically
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .select("items")
      .single();

    if (orderError || !orderData) {
      console.error("Order Update Error:", orderError);
      return NextResponse.json({ 
        error: "Failed to update order status", 
        details: orderError?.message 
      }, { status: 500 });
    }

    // 3. Decrement Inventory using Admin Client
    try {
      const items = orderData.items as any[];
      if (items && Array.isArray(items)) {
        for (const item of items) {
          if (item.productId && item.quantity) {
            // Get current quantity
            const { data: product, error: fetchErr } = await supabaseAdmin
              .from("products")
              .select("quantity")
              .eq("id", item.productId)
              .single();

            if (product && !fetchErr) {
              const newQuantity = Math.max(0, (product.quantity || 0) - item.quantity);
              await supabaseAdmin
                .from("products")
                .update({
                  quantity: newQuantity,
                  is_out_of_stock: newQuantity <= 0,
                })
                .eq("id", item.productId);
            } else if (fetchErr) {
               console.error(`Inventory Fetch Error for ${item.productId}:`, fetchErr.message);
            }
          }
        }
      }
    } catch (invErr) {
      console.error("Inventory Decrement Logic Error:", invErr);
      // We don't fail the whole request because the user paid and order is marked "paid"
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Verify Error:", err);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}
