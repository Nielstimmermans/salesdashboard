"use client";

import { useState } from "react";
import { PeriodFilter } from "@/components/dashboard/period-filter";
import { StoreFilter } from "@/components/dashboard/store-filter";
import { OrdersTable } from "@/components/dashboard/orders-table";
import type { PeriodFilter as PeriodFilterType, DateRange } from "@/types";

export default function OrdersPage() {
  const [period, setPeriod] = useState<PeriodFilterType>("day");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [storeId, setStoreId] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
        <p className="text-sm text-gray-500">
          Bekijk alle orders per medewerker met details
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
        {/* TODO: Tag/Employee filter component */}
      </div>

      {/* Orders Table */}
      <OrdersTable
        period={period}
        dateRange={dateRange}
        storeId={storeId}
        tag={selectedTag}
      />
    </div>
  );
}
