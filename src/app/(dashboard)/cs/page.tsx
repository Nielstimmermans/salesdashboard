"use client";

import { useState } from "react";
import { CSKpiCards } from "@/components/cs/cs-kpi-cards";
import { CSTicketChart } from "@/components/cs/cs-ticket-chart";
import { PeriodFilter } from "@/components/dashboard/period-filter";
import { useCSOverview } from "@/hooks/use-cs-overview";
import type { PeriodFilter as PeriodFilterType, DateRange } from "@/types";

export default function CSOverviewPage() {
  const [period, setPeriod] = useState<PeriodFilterType>("month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { data, timeSeries, viewCounts, loading, error } = useCSOverview({
    period,
    dateRange,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Customer Service Overview
          </h2>
          <p className="text-sm text-gray-500">
            Real-time KPI's van alle Gorgias helpdesks
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <PeriodFilter
            value={period}
            onChange={setPeriod}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      {data ? (
        <CSKpiCards data={data} viewCounts={viewCounts} loading={loading} />
      ) : loading ? (
        <CSKpiCards
          data={{
            ticketsCreated: 0,
            ticketsClosed: 0,
            ticketsOpen: 0,
            ticketsReplied: 0,
            oneTouchRate: 0,
            zeroTouchRate: 0,
            automationRate: 0,
            avgFirstResponseTime: 0,
            avgHumanFirstResponseTime: 0,
            avgResponseTime: 0,
            avgResolutionTime: 0,
            avgHandleTime: 0,
            csatScore: null,
            csatResponseRate: 0,
            csatTotal: 0,
            slaComplianceRate: 0,
            previousPeriod: null,
          }}
          loading
        />
      ) : null}

      {/* Ticket volume chart */}
      <CSTicketChart data={timeSeries} loading={loading} />
    </div>
  );
}
