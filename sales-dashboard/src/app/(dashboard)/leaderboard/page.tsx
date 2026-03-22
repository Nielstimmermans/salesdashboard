"use client";

import { useState } from "react";
import { PeriodFilter } from "@/components/dashboard/period-filter";
import { StoreFilter } from "@/components/dashboard/store-filter";
import { LeaderboardView } from "@/components/dashboard/leaderboard-view";
import type { PeriodFilter as PeriodFilterType, DateRange } from "@/types";

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<PeriodFilterType>("month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [storeId, setStoreId] = useState<string>("all");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Leaderboard</h2>
        <p className="text-sm text-gray-500">
          Wie heeft de meeste sales deze periode?
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <PeriodFilter
          value={period}
          onChange={setPeriod}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
        <StoreFilter value={storeId} onChange={setStoreId} />
      </div>

      {/* Leaderboard */}
      <LeaderboardView
        period={period}
        dateRange={dateRange}
        storeId={storeId}
      />
    </div>
  );
}
