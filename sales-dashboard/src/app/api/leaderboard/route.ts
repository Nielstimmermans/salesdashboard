import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { supabaseAdmin } from "@/lib/supabase";
import { getDateRange, getPreviousDateRange } from "@/lib/utils";
import type { PeriodFilter, LeaderboardEntry } from "@/types";

export async function GET(request: NextRequest) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const period = (searchParams.get("period") || "month") as PeriodFilter;
  const storeId = searchParams.get("storeId") || "all";
  const fromDate = searchParams.get("from");
  const toDate = searchParams.get("to");

  const dateRange =
    fromDate && toDate
      ? { from: new Date(fromDate), to: new Date(toDate) }
      : getDateRange(period);

  const previousRange = getPreviousDateRange(period, dateRange);

  // Helper to query sales per tag for a date range
  async function getSalesPerTag(from: Date, to: Date) {
    let query = supabaseAdmin
      .from("orders")
      .select("tag, total_paid, refund_amount")
      .gte("order_date", from.toISOString())
      .lte("order_date", to.toISOString())
      .not("financial_status", "in", '("voided","cancelled")');

    if (storeId !== "all") {
      query = query.eq("store_id", storeId);
    }

    const { data } = await query;

    const byTag: Record<string, { revenue: number; orders: number }> = {};
    for (const order of data || []) {
      if (!byTag[order.tag]) {
        byTag[order.tag] = { revenue: 0, orders: 0 };
      }
      byTag[order.tag].revenue +=
        Number(order.total_paid) - Number(order.refund_amount);
      byTag[order.tag].orders++;
    }
    return byTag;
  }

  const [currentSales, previousSales] = await Promise.all([
    getSalesPerTag(dateRange.from, dateRange.to),
    getSalesPerTag(previousRange.from, previousRange.to),
  ]);

  // Get employee names
  const allTags = [
    ...new Set([...Object.keys(currentSales), ...Object.keys(previousSales)]),
  ];

  const { data: employees } = await supabaseAdmin
    .from("employees")
    .select("name, tag")
    .in("tag", allTags);

  const employeeMap = new Map(
    (employees || []).map((e) => [e.tag, e.name])
  );

  // Build leaderboard
  const entries: LeaderboardEntry[] = Object.entries(currentSales)
    .map(([tag, data]) => {
      const prevRevenue = previousSales[tag]?.revenue || 0;
      const changePercent =
        prevRevenue > 0
          ? ((data.revenue - prevRevenue) / prevRevenue) * 100
          : 0;

      return {
        rank: 0,
        tag,
        employeeName: employeeMap.get(tag) || tag,
        netRevenue: data.revenue,
        orderCount: data.orders,
        previousNetRevenue: prevRevenue,
        changePercent: Math.round(changePercent * 10) / 10,
      };
    })
    .sort((a, b) => b.netRevenue - a.netRevenue);

  // Assign ranks
  entries.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  return NextResponse.json({ entries });
}
