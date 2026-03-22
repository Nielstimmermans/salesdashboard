"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { PeriodFilter, DateRange, SalesPerEmployee } from "@/types";

interface SalesChartProps {
  period: PeriodFilter;
  dateRange?: DateRange;
  storeId: string;
}

export function SalesChart({ period, dateRange, storeId }: SalesChartProps) {
  const [data, setData] = useState<SalesPerEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch from /api/stats with filters
    // Placeholder data
    setData([]);
    setLoading(false);
  }, [period, dateRange, storeId]);

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        Omzet per medewerker
      </h3>
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-gray-400">Laden...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-gray-400">
            Geen data beschikbaar. Sync eerst je Shopify stores.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="employeeName" />
            <YAxis />
            <Tooltip
              formatter={(value: number) =>
                new Intl.NumberFormat("nl-NL", {
                  style: "currency",
                  currency: "EUR",
                }).format(value)
              }
            />
            <Legend />
            <Bar
              dataKey="netRevenue"
              name="Netto Omzet"
              fill="hsl(221.2, 83.2%, 53.3%)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
