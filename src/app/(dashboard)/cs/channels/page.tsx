"use client";

import { useState } from "react";
import { ChannelDonutChart } from "@/components/cs/channel-donut-chart";
import { ChannelBreakdownTable } from "@/components/cs/channel-breakdown-table";
import { ChannelStackedChart } from "@/components/cs/channel-stacked-chart";
import { PeriodFilter } from "@/components/dashboard/period-filter";
import { StoreFilter } from "@/components/dashboard/store-filter";
import { useChannelDistribution } from "@/hooks/use-channel-distribution";
import type { PeriodFilter as PeriodFilterType, DateRange } from "@/types";

export default function ChannelsPage() {
  const [period, setPeriod] = useState<PeriodFilterType>("month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [storeId, setStoreId] = useState<string>("all");

  const { data, loading, error } = useChannelDistribution({
    period,
    dateRange,
    storeId,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Kanaalverdeling
          </h2>
          <p className="text-sm text-gray-500">
            Ticket volume en performance per communicatiekanaal
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <PeriodFilter
            value={period}
            onChange={setPeriod}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
          <StoreFilter value={storeId} onChange={setStoreId} />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Top section: Donut + Table */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Donut chart */}
        <div className="rounded-xl border bg-white p-6 shadow-sm xl:col-span-1">
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            Verdeling
          </h3>
          <ChannelDonutChart
            channels={data?.channels || []}
            loading={loading}
          />
          {/* Legend */}
          {data && data.channels.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {data.channels.slice(0, 8).map((ch) => (
                <div
                  key={ch.channel}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: ch.color }}
                    />
                    <span className="text-gray-600">{ch.channelLabel}</span>
                  </div>
                  <span className="font-medium text-gray-900">
                    {ch.percentage}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Breakdown table */}
        <div className="xl:col-span-2">
          <ChannelBreakdownTable
            channels={data?.channels || []}
            loading={loading}
          />
        </div>
      </div>

      {/* Stacked bar chart */}
      <ChannelStackedChart
        timeSeries={data?.timeSeries || []}
        channels={data?.channels || []}
        loading={loading}
      />
    </div>
  );
}
