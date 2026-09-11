import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { OrderItem } from "@/lib/types";
import { Resend } from "resend";
import OrderConfirmationEmail from "@/emails/OrderConfirmationEmail";

const resend = new Resend(process.env.RESEND_API_KEY);
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

    const paystackData = (await paystackRes.json()) as {
      status?: boolean;
      data?: { status?: string };
    };

    if (!paystackRes.ok || !paystackData.status || paystackData.data?.status !== "success") {
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
      .select("items, shipping_address, customer_name, customer_email, customer_phone, total, order_number, created_at")
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
      const items = orderData.items as OrderItem[];
      if (items && Array.isArray(items)) {
        for (const item of items) {
          if (item.productId && item.quantity) {
            // Get current quantity and variants
            const { data: product, error: fetchErr } = await supabaseAdmin
              .from("products")
              .select("quantity, variants")
              .eq("id", item.productId)
              .single();

            if (product && !fetchErr) {
              const newQuantity = Math.max(0, (product.quantity || 0) - item.quantity);
              
              let updatedVariants = product.variants;
              let variantsChanged = false;
              if (Array.isArray(updatedVariants)) {
                updatedVariants = updatedVariants.map((v: any) => {
                  let changedV = false;
                  // If we are decrementing a color variant directly (no combo)
                  if (item.variantId && v.id === item.variantId && !item.comboId) {
                    v.quantity = Math.max(0, (v.quantity || 0) - item.quantity);
                    v.isOutOfStock = v.quantity <= 0;
                    changedV = true;
                  }
                  // If we are decrementing a fit-combo directly
                  else if (item.comboId === "fit-combo" && v.id === "fit-combo") {
                    v.quantity = Math.max(0, (v.quantity || 0) - item.quantity);
                    v.isOutOfStock = v.quantity <= 0;
                    changedV = true;
                  }
                  // If we are decrementing a combo inside a color variant (or any variant)
                  if (item.comboId && item.comboId !== "fit-combo" && Array.isArray(v.combos)) {
                    v.combos = v.combos.map((c: any) => {
                      if (c.id === item.comboId) {
                        c.quantity = Math.max(0, (c.quantity || 0) - item.quantity);
                        c.isOutOfStock = c.quantity <= 0;
                        changedV = true;
                      }
                      return c;
                    });
                  }
                  if (changedV) variantsChanged = true;
                  return v;
                });
              }

              const updatePayload: any = {
                quantity: newQuantity,
                is_out_of_stock: newQuantity <= 0,
              };
              if (variantsChanged) {
                updatePayload.variants = updatedVariants;
              }

              await supabaseAdmin
                .from("products")
                .update(updatePayload)
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

    // 4. Send Order Confirmation Email (customer + admin)
    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL || "orders@joeythebrand.com";
      const displayOrderId = orderData.order_number || orderId.slice(0, 8).toUpperCase();
      const emailProps = {
        customerName: orderData.customer_name || "Customer",
        orderId: displayOrderId,
        items: (orderData.items as any) || [],
        total: orderData.total || 0,
        shippingAddress: orderData.shipping_address || "TBD",
        dateOrdered: orderData.created_at || new Date().toISOString(),
      };
      const adminOrdersUrl =
        process.env.ADMIN_ORDERS_URL?.trim() || "https://admin.joeythebrand.com/orders";
      const adminEmail =
        process.env.ORDERS_ADMIN_EMAIL?.trim() ||
        process.env.CONTACT_TO_EMAIL?.trim() ||
        "joeythebrandonline@gmail.com";

      if (orderData.customer_email) {
        await resend.emails.send({
          from: `JOEY The brand <${fromEmail}>`,
          to: orderData.customer_email,
          subject: `Order Confirmation - ${displayOrderId}`,
          react: OrderConfirmationEmail(emailProps),
        });
      }

      await resend.emails.send({
        from: `JOEY The brand <${fromEmail}>`,
        to: adminEmail,
        subject: `New Order - ${displayOrderId}`,
        react: OrderConfirmationEmail({
          ...emailProps,
          isAdmin: true,
          adminOrdersUrl,
        }),
      });
    } catch (emailErr) {
      console.error("Failed to send confirmation email:", emailErr);
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
