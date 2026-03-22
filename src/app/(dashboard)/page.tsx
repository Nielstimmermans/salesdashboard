"use client";

import { useState } from "react";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { SalesTable } from "@/components/dashboard/sales-table";
import { PeriodFilter } from "@/components/dashboard/period-filter";
import { StoreFilter } from "@/components/dashboard/store-filter";
import type { PeriodFilter as PeriodFilterType, DateRange } from "@/types";

export default function DashboardPage() {
  const [period, setPeriod] = useState<PeriodFilterType>("month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [storeId, setStoreId] = useState<string>("all");

  return (
    <div className="space-y-6">
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

      {/* KPI Cards */}
      <StatsCards period={period} dateRange={dateRange} storeId={storeId} />

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SalesChart period={period} dateRange={dateRange} storeId={storeId} />
        <SalesTable period={period} dateRange={dateRange} storeId={storeId} />
      </div>
    </div>
  );
}
