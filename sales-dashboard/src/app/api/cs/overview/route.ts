import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { fetchCSOverview, fetchCSOverviewTimeSeries } from "@/lib/gorgias";
import { getDateRange } from "@/lib/utils";
import type { PeriodFilter } from "@/types";
import type { GorgiasGranularity } from "@/types/gorgias";

export async function GET(request: NextRequest) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get("period") || "month") as PeriodFilter;
  const storeId = searchParams.get("store_id") || "all";
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const includeTimeSeries = searchParams.get("time_series") === "true";

  // Determine date range
  const customRange =
    fromParam && toParam
      ? { from: new Date(fromParam), to: new Date(toParam) }
      : undefined;
  const range = getDateRange(period, customRange);
  const from = range.from.toISOString();
  const to = range.to.toISOString();

  // Determine granularity based on period
  const granularityMap: Record<string, GorgiasGranularity> = {
    day: "hour",
    week: "day",
    month: "day",
    year: "month",
    custom: "day",
  };
  const granularity = granularityMap[period] || "day";

  try {
    const [overview, timeSeries] = await Promise.all([
      fetchCSOverview(from, to, storeId !== "all" ? storeId : undefined),
      includeTimeSeries
        ? fetchCSOverviewTimeSeries(
            from,
            to,
            granularity,
            storeId !== "all" ? storeId : undefined
          )
        : Promise.resolve([]),
    ]);

    return NextResponse.json({
      overview,
      timeSeries,
      period: { from, to, granularity },
    });
  } catch (error) {
    console.error("CS Overview fetch error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch CS overview",
      },
      { status: 500 }
    );
  }
}
