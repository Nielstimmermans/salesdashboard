import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyShopifyWebhook } from "@/lib/shopify";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const hmac = request.headers.get("x-shopify-hmac-sha256");
  const shopDomain = request.headers.get("x-shopify-shop-domain");
  const topic = request.headers.get("x-shopify-topic");

  if (!hmac || !shopDomain || !topic) {
    return NextResponse.json(
      { error: "Missing Shopify headers" },
      { status: 400 }
    );
  }

  // Verify webhook signature
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret || !verifyShopifyWebhook(body, hmac, secret)) {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 }
    );
  }

  const payload = JSON.parse(body);

  // Find the store
  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("id")
    .eq("shopify_domain", shopDomain)
    .single();

  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  // Get valid employee tags
  const { data: employees } = await supabaseAdmin
    .from("employees")
    .select("tag")
    .eq("is_active", true);

  const validTags = new Set(
    (employees || []).map((e) => e.tag.toLowerCase())
  );

  switch (topic) {
    case "orders/create":
    case "orders/updated": {
      // Skip cancelled orders
      if (payload.cancelled_at) {
        // Mark as cancelled in our DB
        await supabaseAdmin
          .from("orders")
          .update({
            financial_status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("store_id", store.id)
          .eq("shopify_order_id", payload.id);
        break;
      }

      // Parse tags
      const tags = payload.tags
        ? payload.tags
            .split(",")
            .map((t: string) => t.trim().toLowerCase())
            .filter((t: string) => validTags.has(t))
        : [];

      if (tags.length === 0) break;

      const totalPaid = parseFloat(payload.current_total_price || "0");
      const refundAmount = (payload.refunds || []).reduce(
        (sum: number, refund: any) =>
          sum +
          (refund.refund_line_items || []).reduce(
            (s: number, item: any) => s + parseFloat(item.subtotal || "0"),
            0
          ),
        0
      );

      for (const tag of tags) {
        await supabaseAdmin.from("orders").upsert(
          {
            store_id: store.id,
            shopify_order_id: payload.id,
            order_number: payload.name,
            tag,
            customer_name: payload.customer
              ? `${payload.customer.first_name || ""} ${
                  payload.customer.last_name || ""
                }`.trim()
              : null,
            total_paid: totalPaid,
            refund_amount: refundAmount,
            financial_status: (
              payload.financial_status || "pending"
            ).toLowerCase(),
            order_date: payload.created_at,
            shopify_created_at: payload.created_at,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "store_id,shopify_order_id,tag" }
        );
      }
      break;
    }

    case "orders/cancelled": {
      await supabaseAdmin
        .from("orders")
        .update({
          financial_status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("store_id", store.id)
        .eq("shopify_order_id", payload.id);
      break;
    }

    case "refunds/create": {
      const orderId = payload.order_id;
      const refundTotal = (payload.refund_line_items || []).reduce(
        (sum: number, item: any) => sum + parseFloat(item.subtotal || "0"),
        0
      );

      // Get existing orders and update refund amount
      const { data: existingOrders } = await supabaseAdmin
        .from("orders")
        .select("id, refund_amount")
        .eq("store_id", store.id)
        .eq("shopify_order_id", orderId);

      for (const existing of existingOrders || []) {
        await supabaseAdmin
          .from("orders")
          .update({
            refund_amount: Number(existing.refund_amount) + refundTotal,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
