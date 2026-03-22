import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getDateRange } from "@/lib/utils";
import type { PeriodFilter } from "@/types";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const period = (searchParams.get("period") || "month") as PeriodFilter;
  const storeId = searchParams.get("storeId") || "all";
  const tag = searchParams.get("tag") || "all";
  const fromDate = searchParams.get("from");
  const toDate = searchParams.get("to");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = 50;

  const dateRange =
    fromDate && toDate
      ? { from: new Date(fromDate), to: new Date(toDate) }
      : getDateRange(period);

  // Build query — all employees can see all orders
  let query = supabaseAdmin
    .from("orders")
    .select("*, stores(name, shopify_domain)", { count: "exact" })
    .gte("order_date", dateRange.from.toISOString())
    .lte("order_date", dateRange.to.toISOString())
    .not("financial_status", "in", '("voided","cancelled")')
    .order("order_date", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (storeId !== "all") {
    query = query.eq("store_id", storeId);
  }

  if (tag !== "all") {
    query = query.eq("tag", tag);
  }

  const { data: orders, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    orders: orders || [],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  });
}
