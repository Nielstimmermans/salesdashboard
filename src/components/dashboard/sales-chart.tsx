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
    async function fetchData() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ period, storeId });
        if (dateRange) {
          params.set("from", dateRange.from.toISOString());
          params.set("to", dateRange.to.toISOString());
        }
        const res = await fetch(`/api/stats?${params}`);
        if (res.ok) {
          const json = await res.json();
          setData(json.salesPerEmployee || []);
        }
      } catch {
        console.error("Failed to fetch chart data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
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
          <p className="text-gray-400">Geen data beschikbaar</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="employeeName" />
            <YAxis />
            <Tooltip
              formatter={(value) =>
                new Intl.NumberFormat("nl-NL", {
                  style: "currency",
                  currency: "EUR",
                }).format(Number(value))
              }
            />
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
