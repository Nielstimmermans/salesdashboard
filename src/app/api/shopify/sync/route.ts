import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { fetchShopifyOrders, parseShopifyGid } from "@/lib/shopify";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role
  const { data: employee } = await supabaseAdmin
    .from("employees")
    .select("role")
    .eq("clerk_user_id", userId)
    .single();

  if (!employee || employee.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  // Get all employee tags for matching
  const { data: employees } = await supabaseAdmin
    .from("employees")
    .select("tag")
    .eq("is_active", true);

  const employeeTags = (employees || []).map((e) => e.tag.toLowerCase());
  const validTags = new Set(employeeTags);

  if (employeeTags.length === 0) {
    return NextResponse.json({
      results: [{ store: "Alle", status: "error", error: "Geen actieve medewerkers met tags gevonden" }],
    });
  }

  // Get all active stores
  const { data: stores, error: storesError } = await supabaseAdmin
    .from("stores")
    .select("*")
    .eq("is_active", true);

  if (storesError || !stores) {
    return NextResponse.json(
      { error: "Failed to fetch stores" },
      { status: 500 }
    );
  }

  const results = [];

  for (const store of stores) {
    try {
      // Only fetch orders that have employee tags — much faster than pulling everything
      const sinceDate = store.last_synced_at
        ? store.last_synced_at
        : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

      const shopifyOrders = await fetchShopifyOrders(store, {
        sinceDate,
        tags: employeeTags,
      });

      let synced = 0;
      let skipped = 0;

      for (const order of shopifyOrders) {
        if (order.cancelledAt) {
          skipped++;
          continue;
        }

        const matchedTags = order.tags.filter((tag) =>
          validTags.has(tag.toLowerCase())
        );

        if (matchedTags.length === 0) {
          skipped++;
          continue;
        }

        const shopifyOrderId = parseShopifyGid(order.id);
        const totalPaid = parseFloat(
          order.currentTotalPriceSet.shopMoney.amount
        );
        const refundAmount = parseFloat(
          order.totalRefundedSet.shopMoney.amount
        );

        for (const tag of matchedTags) {
          const { error: upsertError } = await supabaseAdmin
            .from("orders")
            .upsert(
              {
                store_id: store.id,
                shopify_order_id: shopifyOrderId,
                order_number: order.name,
                tag: tag.toLowerCase(),
                customer_name: null,
                total_paid: totalPaid,
                refund_amount: refundAmount,
                financial_status:
                  order.displayFinancialStatus.toLowerCase(),
                order_date: order.createdAt,
                shopify_created_at: order.createdAt,
                updated_at: new Date().toISOString(),
              },
              {
                onConflict: "store_id,shopify_order_id,tag",
              }
            );

          if (!upsertError) synced++;
        }
      }

      // Update last_synced_at
      await supabaseAdmin
        .from("stores")
        .update({
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", store.id);

      results.push({
        store: store.name,
        status: "success",
        synced,
        skipped,
        total: shopifyOrders.length,
      });
    } catch (error) {
      results.push({
        store: store.name,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ results });
}
