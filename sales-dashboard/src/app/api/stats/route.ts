import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { supabaseAdmin } from "@/lib/supabase";
import { getDateRange } from "@/lib/utils";
import type { PeriodFilter, DashboardStats, SalesPerEmployee } from "@/types";

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

  // Determine date range
  const dateRange =
    fromDate && toDate
      ? { from: new Date(fromDate), to: new Date(toDate) }
      : getDateRange(period);

  // Get employee info for current user
  const { data: employee } = await supabaseAdmin
    .from("employees")
    .select("*")
    .eq("clerk_user_id", userId)
    .single();

  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  // Build query
  let query = supabaseAdmin
    .from("orders")
    .select("*")
    .gte("order_date", dateRange.from.toISOString())
    .lte("order_date", dateRange.to.toISOString())
    .not("financial_status", "in", '("voided","cancelled")');

  // Filter by store
  if (storeId !== "all") {
    query = query.eq("store_id", storeId);
  }

  // Non-admins only see their own data
  if (employee.role !== "admin") {
    query = query.eq("tag", employee.tag);
  }

  const { data: orders, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Calculate stats
  const stats: DashboardStats = {
    totalRevenue: orders.reduce((sum, o) => sum + Number(o.total_paid), 0),
    totalOrders: orders.length,
    averageOrderValue:
      orders.length > 0
        ? orders.reduce((sum, o) => sum + Number(o.total_paid), 0) /
          orders.length
        : 0,
    totalRefunds: orders.reduce((sum, o) => sum + Number(o.refund_amount), 0),
    netRevenue: orders.reduce(
      (sum, o) => sum + Number(o.total_paid) - Number(o.refund_amount),
      0
    ),
  };

  // Sales per employee (for admins)
  const salesByTag: Record<string, SalesPerEmployee> = {};
  for (const order of orders) {
    if (!salesByTag[order.tag]) {
      salesByTag[order.tag] = {
        tag: order.tag,
        employeeName: order.tag, // Will be resolved below
        orderCount: 0,
        totalRevenue: 0,
        totalRefunds: 0,
        netRevenue: 0,
      };
    }
    salesByTag[order.tag].orderCount++;
    salesByTag[order.tag].totalRevenue += Number(order.total_paid);
    salesByTag[order.tag].totalRefunds += Number(order.refund_amount);
    salesByTag[order.tag].netRevenue +=
      Number(order.total_paid) - Number(order.refund_amount);
  }

  // Resolve employee names
  const tags = Object.keys(salesByTag);
  if (tags.length > 0) {
    const { data: employees } = await supabaseAdmin
      .from("employees")
      .select("name, tag")
      .in("tag", tags);

    if (employees) {
      for (const emp of employees) {
        if (salesByTag[emp.tag]) {
          salesByTag[emp.tag].employeeName = emp.name;
        }
      }
    }
  }

  const salesPerEmployee = Object.values(salesByTag).sort(
    (a, b) => b.netRevenue - a.netRevenue
  );

  return NextResponse.json({
    stats,
    salesPerEmployee,
  });
}
